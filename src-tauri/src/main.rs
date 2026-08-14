// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    prefer_xwayland_when_available();

    app_lib::run();
}

#[cfg(target_os = "linux")]
fn prefer_xwayland_when_available() {
    let is_wayland_session = std::env::var("XDG_SESSION_TYPE")
        .map(|session| session.eq_ignore_ascii_case("wayland"))
        .unwrap_or(false);
    let has_xwayland_display = std::env::var_os("DISPLAY").is_some();

    if is_wayland_session && has_xwayland_display {
        std::env::set_var("GDK_BACKEND", "x11");
    }
}
