use std::{
    fs,
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Condvar, Mutex,
    },
    thread,
    time::Duration,
};
use tauri::State;

#[derive(Default)]
pub struct CameraManager {
    session: Mutex<Option<CameraSession>>,
}

#[derive(Default)]
struct FrameState {
    sequence: u64,
    jpeg: Vec<u8>,
}

type SharedFrames = Arc<(Mutex<FrameState>, Condvar)>;

struct CameraSession {
    child: Child,
    stream_url: String,
    frames: SharedFrames,
    should_stop: Arc<AtomicBool>,
}

impl CameraSession {
    fn stop(&mut self) {
        self.should_stop.store(true, Ordering::Release);
        self.frames.1.notify_all();
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Drop for CameraManager {
    fn drop(&mut self) {
        if let Ok(session) = self.session.get_mut() {
            if let Some(mut session) = session.take() {
                session.stop();
            }
        }
    }
}

fn find_jpeg_marker(buffer: &[u8], marker: [u8; 2], start: usize) -> Option<usize> {
    buffer
        .get(start..)?
        .windows(2)
        .position(|window| window == marker)
        .map(|position| position + start)
}

fn read_camera_frames(mut output: impl Read, frames: SharedFrames, should_stop: Arc<AtomicBool>) {
    let mut chunk = [0_u8; 32 * 1024];
    let mut buffer = Vec::with_capacity(256 * 1024);

    while !should_stop.load(Ordering::Acquire) {
        let Ok(bytes_read) = output.read(&mut chunk) else {
            break;
        };
        if bytes_read == 0 {
            break;
        }

        buffer.extend_from_slice(&chunk[..bytes_read]);

        loop {
            let Some(frame_start) = find_jpeg_marker(&buffer, [0xff, 0xd8], 0) else {
                buffer.clear();
                break;
            };

            if frame_start > 0 {
                buffer.drain(..frame_start);
            }

            let Some(frame_end) = find_jpeg_marker(&buffer, [0xff, 0xd9], 2) else {
                break;
            };

            let jpeg = buffer[..frame_end + 2].to_vec();
            buffer.drain(..frame_end + 2);

            if let Ok(mut frame_state) = frames.0.lock() {
                frame_state.sequence = frame_state.sequence.wrapping_add(1);
                frame_state.jpeg = jpeg;
                frames.1.notify_all();
            }
        }

        if buffer.len() > 8 * 1024 * 1024 {
            buffer.clear();
        }
    }

    should_stop.store(true, Ordering::Release);
    frames.1.notify_all();
}

fn stream_mjpeg_client(mut client: TcpStream, frames: SharedFrames, should_stop: Arc<AtomicBool>) {
    let _ = client.set_read_timeout(Some(Duration::from_secs(2)));
    let mut request = [0_u8; 4096];
    let _ = client.read(&mut request);

    let headers = concat!(
        "HTTP/1.1 200 OK\r\n",
        "Content-Type: multipart/x-mixed-replace; boundary=msnframe\r\n",
        "Cache-Control: no-store, no-cache, must-revalidate\r\n",
        "Pragma: no-cache\r\n",
        "Access-Control-Allow-Origin: *\r\n",
        "X-Content-Type-Options: nosniff\r\n",
        "Connection: close\r\n\r\n"
    );

    if client.write_all(headers.as_bytes()).is_err() {
        return;
    }

    let mut last_sequence = 0;

    while !should_stop.load(Ordering::Acquire) {
        let Ok(frame_state) = frames.0.lock() else {
            break;
        };
        let Ok((frame_state, _)) =
            frames
                .1
                .wait_timeout_while(frame_state, Duration::from_secs(1), |state| {
                    state.sequence == last_sequence && !should_stop.load(Ordering::Acquire)
                })
        else {
            break;
        };

        if should_stop.load(Ordering::Acquire) {
            break;
        }

        if frame_state.sequence == last_sequence || frame_state.jpeg.is_empty() {
            continue;
        }

        last_sequence = frame_state.sequence;
        let jpeg = frame_state.jpeg.clone();
        drop(frame_state);

        let frame_header = format!(
            "--msnframe\r\nContent-Type: image/jpeg\r\nContent-Length: {}\r\n\r\n",
            jpeg.len()
        );

        if client.write_all(frame_header.as_bytes()).is_err()
            || client.write_all(&jpeg).is_err()
            || client.write_all(b"\r\n").is_err()
            || client.flush().is_err()
        {
            break;
        }
    }
}

fn serve_mjpeg(listener: TcpListener, frames: SharedFrames, should_stop: Arc<AtomicBool>) {
    if listener.set_nonblocking(true).is_err() {
        return;
    }

    while !should_stop.load(Ordering::Acquire) {
        match listener.accept() {
            Ok((client, _)) => {
                let client_frames = Arc::clone(&frames);
                let client_stop = Arc::clone(&should_stop);
                thread::spawn(move || stream_mjpeg_client(client, client_frames, client_stop));
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(20));
            }
            Err(_) => break,
        }
    }
}

fn find_video_devices() -> Vec<PathBuf> {
    let mut devices = fs::read_dir("/dev")
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let file_name = entry.file_name();
            let file_name = file_name.to_str()?;
            let device_number = file_name.strip_prefix("video")?;

            device_number
                .chars()
                .all(|character| character.is_ascii_digit())
                .then(|| entry.path())
        })
        .collect::<Vec<_>>();

    devices.sort();
    devices
}

fn spawn_ffmpeg_camera(device: &str, use_mjpeg: bool) -> Result<Child, String> {
    let mut command = Command::new("ffmpeg");
    command.args([
        "-hide_banner",
        "-loglevel",
        "error",
        "-fflags",
        "nobuffer",
        "-flags",
        "low_delay",
        "-f",
        "v4l2",
        "-thread_queue_size",
        "2",
    ]);

    if use_mjpeg {
        command.args([
            "-input_format",
            "mjpeg",
            "-framerate",
            "30",
            "-video_size",
            "1280x720",
        ]);
    } else {
        command.args(["-framerate", "30", "-video_size", "640x480"]);
    }

    command
        .args([
            "-i",
            device,
            "-an",
            "-vf",
            if use_mjpeg {
                "scale=640:360:flags=lanczos"
            } else {
                "crop=640:360:0:60"
            },
            "-fps_mode",
            "passthrough",
            "-q:v",
            "3",
            "-f",
            "image2pipe",
            "-vcodec",
            "mjpeg",
            "pipe:1",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|error| format!("Não foi possível iniciar o FFmpeg: {error}"))
}

fn spawn_gstreamer_camera() -> Result<Child, String> {
    Command::new("gst-launch-1.0")
        .args([
            "-q",
            "autovideosrc",
            "!",
            "videoconvert",
            "!",
            "videoscale",
            "!",
            "video/x-raw,width=640,height=360",
            "!",
            "jpegenc",
            "quality=85",
            "!",
            "fdsink",
            "fd=1",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|error| format!("Não foi possível iniciar o GStreamer: {error}"))
}

fn start_camera_process() -> Result<Child, String> {
    for device in find_video_devices() {
        let Some(device) = device.to_str() else {
            continue;
        };

        for use_mjpeg in [true, false] {
            let Ok(mut child) = spawn_ffmpeg_camera(device, use_mjpeg) else {
                continue;
            };

            thread::sleep(Duration::from_millis(400));
            if child
                .try_wait()
                .map_err(|error| format!("Erro ao testar a câmera: {error}"))?
                .is_none()
            {
                return Ok(child);
            }

            let _ = child.wait();
        }
    }

    spawn_gstreamer_camera()
}

#[tauri::command]
pub fn start_native_camera(manager: State<'_, CameraManager>) -> Result<String, String> {
    let mut current_session = manager
        .session
        .lock()
        .map_err(|_| "Não foi possível acessar o estado da câmera.".to_string())?;

    if let Some(session) = current_session.as_mut() {
        if session
            .child
            .try_wait()
            .map_err(|error| format!("Erro ao consultar a câmera: {error}"))?
            .is_none()
        {
            return Ok(session.stream_url.clone());
        }
        current_session.take();
    }

    let mut child = start_camera_process()?;

    thread::sleep(Duration::from_millis(250));
    if let Some(status) = child
        .try_wait()
        .map_err(|error| format!("Erro ao iniciar a câmera: {error}"))?
    {
        return Err(format!(
            "O capturador encerrou antes de abrir a câmera ({status})."
        ));
    }

    let output = child
        .stdout
        .take()
        .ok_or_else(|| "O capturador não forneceu a saída de vídeo.".to_string())?;
    let listener = TcpListener::bind(("127.0.0.1", 0))
        .map_err(|error| format!("Não foi possível abrir o stream local: {error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| format!("Não foi possível identificar o stream local: {error}"))?
        .port();
    let stream_url = format!("http://localhost:{port}/camera.mjpeg");
    let frames = Arc::new((Mutex::new(FrameState::default()), Condvar::new()));
    let should_stop = Arc::new(AtomicBool::new(false));

    let reader_frames = Arc::clone(&frames);
    let reader_stop = Arc::clone(&should_stop);
    thread::spawn(move || read_camera_frames(output, reader_frames, reader_stop));

    let server_frames = Arc::clone(&frames);
    let server_stop = Arc::clone(&should_stop);
    thread::spawn(move || serve_mjpeg(listener, server_frames, server_stop));

    *current_session = Some(CameraSession {
        child,
        stream_url: stream_url.clone(),
        frames,
        should_stop,
    });

    Ok(stream_url)
}

#[tauri::command]
pub fn stop_native_camera(manager: State<'_, CameraManager>) -> Result<(), String> {
    let mut current_session = manager
        .session
        .lock()
        .map_err(|_| "Não foi possível acessar o estado da câmera.".to_string())?;

    if let Some(mut session) = current_session.take() {
        session.stop();
    }

    Ok(())
}
