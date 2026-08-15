#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

mod camera;
mod kwin_attention;
mod media_session;

#[cfg(desktop)]
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn uses_wayland() -> bool {
    if std::env::var("GDK_BACKEND")
        .map(|backend| backend.eq_ignore_ascii_case("x11"))
        .unwrap_or(false)
    {
        return false;
    }

    std::env::var("XDG_SESSION_TYPE")
        .map(|session| session.eq_ignore_ascii_case("wayland"))
        .unwrap_or(false)
        || std::env::var_os("WAYLAND_DISPLAY").is_some()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(camera::CameraManager::default())
        .invoke_handler(tauri::generate_handler![
            uses_wayland,
            kwin_attention::set_kwin_window_attention,
            media_session::get_current_media,
            camera::start_native_camera,
            camera::stop_native_camera
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            #[cfg(desktop)]
            {
                let open_item =
                    MenuItem::with_id(app, "open", "Abrir MSN Messenger", true, None::<&str>)?;
                let quit_item =
                    MenuItem::with_id(app, "quit", "Encerrar sessão", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&open_item, &quit_item])?;

                let mut tray = TrayIconBuilder::new()
                    .menu(&menu)
                    .tooltip("MSN Messenger")
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id().as_ref() {
                        "open" => show_main_window(app),
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            show_main_window(tray.app_handle());
                        }
                    });

                if let Some(icon) = app.default_window_icon() {
                    tray = tray.icon(icon.clone());
                }

                tray.build(app)?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            #[cfg(desktop)]
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
