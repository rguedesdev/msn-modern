use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaInfo {
    title: String,
    artist: String,
    source: String,
}

#[cfg(target_os = "linux")]
fn read_current_media() -> Result<Option<MediaInfo>, String> {
    use dbus::{
        arg::{PropMap, RefArg},
        blocking::{stdintf::org_freedesktop_dbus::Properties, Connection},
    };
    use std::time::Duration;

    const MPRIS_PREFIX: &str = "org.mpris.MediaPlayer2.";
    const ROOT_INTERFACE: &str = "org.mpris.MediaPlayer2";
    const PLAYER_INTERFACE: &str = "org.mpris.MediaPlayer2.Player";

    fn metadata_text(metadata: &PropMap, key: &str) -> Option<String> {
        metadata
            .get(key)
            .and_then(|value| value.0.as_str())
            .map(str::to_owned)
    }

    fn metadata_artists(metadata: &PropMap) -> String {
        metadata
            .get("xesam:artist")
            .and_then(|value| value.0.as_iter())
            .map(|artists| {
                artists
                    .filter_map(|artist| artist.as_str().map(str::to_owned))
                    .collect::<Vec<_>>()
                    .join(", ")
            })
            .filter(|artists| !artists.is_empty())
            .unwrap_or_else(|| "Artista desconhecido".to_owned())
    }

    fn identify_music_source(
        service_name: &str,
        identity: &str,
        media_url: &str,
    ) -> Option<String> {
        let searchable_source = format!("{service_name} {identity} {media_url}").to_lowercase();
        let player_identity = format!("{service_name} {identity}").to_lowercase();

        if searchable_source.contains("asiadreamradio.torontocast.stream")
            || searchable_source.contains("asiadreamradio.com")
        {
            let asia_dream_channels = [
                ("japanhitsplayer", "Asia DREAM Radio — Japan Hits"),
                ("jpowerplayer", "Asia DREAM Radio — J-Pop Powerplay"),
                ("jkawaiiplayer", "Asia DREAM Radio — J-Pop Powerplay Kawaii"),
                ("natsukashiiplayer", "Asia DREAM Radio — J-Sakura"),
                ("jrockplayer", "Asia DREAM Radio — J-Rock Powerplay"),
                ("jclubplayer", "Asia DREAM Radio — J-Club Powerplay HipHop"),
                ("jazzbandplayer", "Asia DREAM Radio — Jazz Sakura"),
            ];

            return Some(
                asia_dream_channels
                    .iter()
                    .find(|(identifier, _)| searchable_source.contains(identifier))
                    .map(|(_, label)| *label)
                    .unwrap_or("Asia DREAM Radio")
                    .to_owned(),
            );
        }

        let streaming_services = [
            ("spotify", "Spotify"),
            ("music.amazon.", "Amazon Music"),
            ("amazon music", "Amazon Music"),
            ("deezer.com", "Deezer"),
            ("deezer", "Deezer"),
            ("kissfm.com.br", "Kiss FM"),
            ("kissfm", "Kiss FM"),
            ("kiss fm", "Kiss FM"),
            ("radiojhero.com", "Rádio J-Hero"),
            ("radiorock.com.br", "89 A Rádio Rock"),
            ("89fm.com.br", "89 A Rádio Rock"),
            ("radio_89fm", "89 A Rádio Rock"),
            ("tidal.com", "TIDAL"),
            ("tidal", "TIDAL"),
            ("music.youtube.com", "YouTube Music"),
            ("youtube.com", "YouTube"),
            ("youtu.be", "YouTube"),
            ("music.apple.com", "Apple Music"),
            ("apple music", "Apple Music"),
            ("napster.com", "Napster"),
            ("napster", "Napster"),
            ("music.line.me", "LINE MUSIC"),
            ("line music", "LINE MUSIC"),
            ("soundcloud.com", "SoundCloud"),
            ("soundcloud", "SoundCloud"),
            ("qobuz.com", "Qobuz"),
            ("qobuz", "Qobuz"),
            ("pandora.com", "Pandora"),
            ("bandcamp.com", "Bandcamp"),
            ("audiomack.com", "Audiomack"),
            ("anghami.com", "Anghami"),
            ("jiosaavn.com", "JioSaavn"),
            ("boomplay.com", "Boomplay"),
        ];

        if let Some((_, label)) = streaming_services
            .iter()
            .find(|(identifier, _)| searchable_source.contains(identifier))
        {
            return Some((*label).to_owned());
        }

        // Apenas players dedicados à música. Navegadores e players de uso geral,
        // como VLC, ficam de fora para não divulgar filmes, vídeos ou podcasts.
        const DEDICATED_MUSIC_PLAYERS: &[&str] = &[
            "amberol",
            "amarok",
            "audacious",
            "banshee",
            "cantata",
            "clementine",
            "cmus",
            "deadbeef",
            "elisa",
            "gapless",
            "gmusicbrowser",
            "lollypop",
            "mocp",
            "mpdris",
            "musicpod",
            "pragha",
            "qmmp",
            "quod libet",
            "quodlibet",
            "rhythmbox",
            "sayonara",
            "strawberry",
            "tauon",
            "yarock",
        ];

        DEDICATED_MUSIC_PLAYERS
            .iter()
            .any(|player| player_identity.contains(player))
            .then(|| identity.to_owned())
    }

    let connection = Connection::new_session()
        .map_err(|error| format!("Não foi possível acessar a sessão D-Bus: {error}"))?;
    let dbus_proxy = connection.with_proxy(
        "org.freedesktop.DBus",
        "/org/freedesktop/DBus",
        Duration::from_millis(800),
    );
    let (mut names,): (Vec<String>,) = dbus_proxy
        .method_call("org.freedesktop.DBus", "ListNames", ())
        .map_err(|error| format!("Não foi possível listar os players MPRIS: {error}"))?;

    names.sort();

    for name in names
        .into_iter()
        .filter(|name| name.starts_with(MPRIS_PREFIX))
    {
        let player = connection.with_proxy(
            name.clone(),
            "/org/mpris/MediaPlayer2",
            Duration::from_millis(800),
        );
        let playback_status: String = match player.get(PLAYER_INTERFACE, "PlaybackStatus") {
            Ok(status) => status,
            Err(_) => continue,
        };

        if playback_status != "Playing" {
            continue;
        }

        let metadata: PropMap = match player.get(PLAYER_INTERFACE, "Metadata") {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };
        let Some(title) = metadata_text(&metadata, "xesam:title") else {
            continue;
        };
        let service_name = name.trim_start_matches(MPRIS_PREFIX);
        let identity: String = player
            .get(ROOT_INTERFACE, "Identity")
            .unwrap_or_else(|_| service_name.to_owned());
        let media_url = metadata_text(&metadata, "xesam:url").unwrap_or_default();
        let Some(source) = identify_music_source(service_name, &identity, &media_url) else {
            continue;
        };

        return Ok(Some(MediaInfo {
            title,
            artist: metadata_artists(&metadata),
            source,
        }));
    }

    Ok(None)
}

#[cfg(target_os = "windows")]
fn read_current_media() -> Result<Option<MediaInfo>, String> {
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSession,
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    };

    fn relevant_window_titles(media_title: &str) -> String {
        use windows::{
            core::BOOL,
            Win32::{
                Foundation::{HWND, LPARAM},
                System::Com::{
                    CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
                    COINIT_MULTITHREADED,
                },
                UI::{
                    Accessibility::{
                        CUIAutomation, IUIAutomation, IUIAutomationValuePattern,
                        TreeScope_Descendants, UIA_EditControlTypeId, UIA_ValuePatternId,
                    },
                    WindowsAndMessaging::{
                        EnumWindows, GetClassNameW, GetWindowTextW, IsWindowVisible,
                    },
                },
            },
        };

        struct BrowserWindows {
            titles: Vec<String>,
            handles: Vec<HWND>,
        }

        unsafe extern "system" fn collect_title(hwnd: HWND, parameter: LPARAM) -> BOOL {
            if !unsafe { IsWindowVisible(hwnd) }.as_bool() {
                return BOOL::from(true);
            }

            let windows = unsafe { &mut *(parameter.0 as *mut BrowserWindows) };
            let mut buffer = [0_u16; 512];
            let length = unsafe { GetWindowTextW(hwnd, &mut buffer) };
            if length > 0 {
                windows
                    .titles
                    .push(String::from_utf16_lossy(&buffer[..length as usize]));
            }

            let mut class_buffer = [0_u16; 128];
            let class_length = unsafe { GetClassNameW(hwnd, &mut class_buffer) };
            if class_length > 0 {
                let class_name =
                    String::from_utf16_lossy(&class_buffer[..class_length as usize]).to_lowercase();
                if class_name.contains("chrome_widgetwin")
                    || class_name.contains("mozillawindowclass")
                {
                    windows.handles.push(hwnd);
                }
            }

            BOOL::from(true)
        }

        fn browser_urls(handles: &[HWND]) -> Vec<String> {
            let initialization = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
            let should_uninitialize = initialization.is_ok();

            let result = (|| -> windows::core::Result<Vec<String>> {
                let automation: IUIAutomation = unsafe {
                    CoCreateInstance(
                        &CUIAutomation,
                        None::<&windows::core::IUnknown>,
                        CLSCTX_INPROC_SERVER,
                    )?
                };
                let condition = unsafe { automation.CreateTrueCondition()? };
                let mut urls = Vec::new();

                for &handle in handles {
                    let Ok(window) = (unsafe { automation.ElementFromHandle(handle) }) else {
                        continue;
                    };
                    let Ok(elements) =
                        (unsafe { window.FindAll(TreeScope_Descendants, &condition) })
                    else {
                        continue;
                    };
                    let length = unsafe { elements.Length() }.unwrap_or(0).min(3_000);

                    for index in 0..length {
                        let Ok(element) = (unsafe { elements.GetElement(index) }) else {
                            continue;
                        };
                        if unsafe { element.CurrentControlType() }.ok()
                            != Some(UIA_EditControlTypeId)
                        {
                            continue;
                        }

                        let automation_id = unsafe { element.CurrentAutomationId() }
                            .map(|value| value.to_string().to_lowercase())
                            .unwrap_or_default();
                        let name = unsafe { element.CurrentName() }
                            .map(|value| value.to_string().to_lowercase())
                            .unwrap_or_default();
                        let is_address_bar = automation_id == "view_1001"
                            || automation_id.contains("urlbar")
                            || name.contains("address")
                            || name.contains("endereço")
                            || name.contains("endereco");
                        if !is_address_bar {
                            continue;
                        }

                        let Ok(pattern) = (unsafe {
                            element.GetCurrentPatternAs::<IUIAutomationValuePattern>(
                                UIA_ValuePatternId,
                            )
                        }) else {
                            continue;
                        };
                        let value = unsafe { pattern.CurrentValue() }
                            .map(|value| value.to_string())
                            .unwrap_or_default();
                        if !value.trim().is_empty() {
                            urls.push(value);
                        }
                    }
                }

                Ok(urls)
            })();

            if should_uninitialize {
                unsafe { CoUninitialize() };
            }

            result.unwrap_or_default()
        }

        let mut windows = BrowserWindows {
            titles: Vec::new(),
            handles: Vec::new(),
        };
        let parameter = LPARAM((&mut windows as *mut BrowserWindows) as isize);
        let _ = unsafe { EnumWindows(Some(collect_title), parameter) };

        let normalized_media_title = media_title.trim().to_lowercase();
        let matching_titles = windows
            .titles
            .iter()
            .filter(|title| {
                !normalized_media_title.is_empty()
                    && title.to_lowercase().contains(&normalized_media_title)
            })
            .cloned()
            .collect::<Vec<_>>();

        let titles = if matching_titles.is_empty() {
            windows.titles.join(" ")
        } else {
            matching_titles.join(" ")
        };
        let urls = browser_urls(&windows.handles).join(" ");

        format!("{titles} {urls}")
    }

    fn identify_windows_source(source_app_id: &str, metadata: &str, window_titles: &str) -> String {
        let searchable_source = format!("{source_app_id} {metadata}").to_lowercase();
        let streaming_services = [
            ("spotify", "Spotify"),
            ("music.amazon.", "Amazon Music"),
            ("amazonmusic", "Amazon Music"),
            ("amazon music", "Amazon Music"),
            ("deezer", "Deezer"),
            ("kissfm", "Kiss FM"),
            ("kiss fm", "Kiss FM"),
            ("rádio j-hero", "Rádio J-Hero"),
            ("radio j-hero", "Rádio J-Hero"),
            ("radiojhero", "Rádio J-Hero"),
            ("89fm", "89 A Rádio Rock"),
            ("radiorock.com.br", "89 A Rádio Rock"),
            ("a rádio rock", "89 A Rádio Rock"),
            ("a radio rock", "89 A Rádio Rock"),
            ("tidal", "TIDAL"),
            ("youtube music", "YouTube Music"),
            ("youtubemusic", "YouTube Music"),
            ("youtube", "YouTube"),
            ("applemusic", "Apple Music"),
            ("apple music", "Apple Music"),
            ("music.apple.com", "Apple Music"),
            ("itunes", "Apple Music"),
            ("napster", "Napster"),
            ("line music", "LINE MUSIC"),
            ("linemusic", "LINE MUSIC"),
            ("music.line.me", "LINE MUSIC"),
            ("soundcloud", "SoundCloud"),
            ("qobuz", "Qobuz"),
            ("pandora", "Pandora"),
            ("bandcamp", "Bandcamp"),
            ("audiomack", "Audiomack"),
            ("anghami", "Anghami"),
            ("jiosaavn", "JioSaavn"),
            ("boomplay", "Boomplay"),
            ("asia dream radio", "Asia DREAM Radio"),
            ("asiadreamradio", "Asia DREAM Radio"),
        ];

        if let Some((_, label)) = streaming_services
            .iter()
            .find(|(identifier, _)| searchable_source.contains(identifier))
        {
            return (*label).to_owned();
        }

        let normalized_app_id = source_app_id.to_lowercase();
        let local_players = [
            ("vlc", "VLC"),
            ("wmplayer", "Windows Media Player"),
            ("zunemusic", "Media Player"),
            ("media player", "Media Player"),
            ("foobar2000", "foobar2000"),
            ("musicbee", "MusicBee"),
            ("aimp", "AIMP"),
            ("winamp", "Winamp"),
            ("mpv", "MPV"),
        ];

        if let Some((_, label)) = local_players
            .iter()
            .find(|(identifier, _)| normalized_app_id.contains(identifier))
        {
            return (*label).to_owned();
        }

        // No Windows, navegadores podem publicar apenas um AUMID genérico ou
        // gerado, sem mencionar Chrome/Edge/Firefox. O título da janela ainda
        // contém normalmente o nome do serviço (por exemplo, "- YouTube").
        let normalized_window_titles = window_titles.to_lowercase();
        if let Some((_, label)) = streaming_services
            .iter()
            .find(|(identifier, _)| normalized_window_titles.contains(identifier))
        {
            return (*label).to_owned();
        }

        let browsers = [
            ("chrome", "Google Chrome"),
            ("chromium", "Chromium"),
            ("msedge", "Microsoft Edge"),
            ("firefox", "Mozilla Firefox"),
            ("brave", "Brave"),
            ("vivaldi", "Vivaldi"),
            ("opera", "Opera"),
            ("librewolf", "LibreWolf"),
            ("waterfox", "Waterfox"),
            ("floorp", "Floorp"),
            ("zen", "Zen Browser"),
        ];

        if let Some((_, label)) = browsers
            .iter()
            .find(|(identifier, _)| normalized_app_id.contains(identifier))
        {
            return (*label).to_owned();
        }

        source_app_id
            .rsplit(['\\', '/', '!'])
            .next()
            .map(|name| name.trim_end_matches(".exe").trim())
            .filter(|name| !name.is_empty())
            .unwrap_or("Player de música")
            .to_owned()
    }

    fn media_from_session(
        session: &GlobalSystemMediaTransportControlsSession,
    ) -> Result<Option<MediaInfo>, windows::core::Error> {
        let playback_status = session.GetPlaybackInfo()?.PlaybackStatus()?;
        if playback_status != GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
            return Ok(None);
        }

        let properties = session.TryGetMediaPropertiesAsync()?.join()?;
        let title = properties.Title()?.to_string();
        if title.trim().is_empty() {
            return Ok(None);
        }

        let artist = properties
            .Artist()
            .map(|value| value.to_string())
            .unwrap_or_default();
        let subtitle = properties
            .Subtitle()
            .map(|value| value.to_string())
            .unwrap_or_default();
        let album_title = properties
            .AlbumTitle()
            .map(|value| value.to_string())
            .unwrap_or_default();
        let source_app_id = session
            .SourceAppUserModelId()
            .map(|value| value.to_string())
            .unwrap_or_default();
        let metadata = format!("{title} {artist} {subtitle} {album_title}");
        let source =
            identify_windows_source(&source_app_id, &metadata, &relevant_window_titles(&title));

        Ok(Some(MediaInfo {
            title,
            artist: if artist.trim().is_empty() {
                "Artista desconhecido".to_owned()
            } else {
                artist
            },
            source,
        }))
    }

    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .and_then(|operation| operation.join())
        .map_err(|error| format!("Não foi possível acessar as sessões de mídia: {error}"))?;
    let sessions = manager
        .GetSessions()
        .map_err(|error| format!("Não foi possível listar as sessões de mídia: {error}"))?;

    for index in 0..sessions
        .Size()
        .map_err(|error| format!("Não foi possível contar as sessões de mídia: {error}"))?
    {
        let session = match sessions.GetAt(index) {
            Ok(session) => session,
            Err(_) => continue,
        };

        match media_from_session(&session) {
            Ok(Some(media)) => return Ok(Some(media)),
            Ok(None) | Err(_) => continue,
        }
    }

    Ok(None)
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
fn read_current_media() -> Result<Option<MediaInfo>, String> {
    Ok(None)
}

#[tauri::command]
pub async fn get_current_media() -> Result<Option<MediaInfo>, String> {
    tauri::async_runtime::spawn_blocking(read_current_media)
        .await
        .map_err(|error| format!("Falha ao consultar a mídia atual: {error}"))?
}
