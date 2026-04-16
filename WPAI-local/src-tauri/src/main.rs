// WorkPilot AI Local Companion — Tauri Entry Point
// System tray application for local meeting audio capture

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auth;
mod audio;
mod upload;
mod session;
mod tray;

use log::info;

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    info!("Starting WorkPilot Companion v{}", env!("CARGO_PKG_VERSION"));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            auth::pair_device,
            auth::verify_token,
            auth::get_auth_status,
            session::start_listening,
            session::stop_listening,
            session::get_session_status,
            audio::list_audio_devices,
        ])
        .setup(|app| {
            tray::setup_tray(app)?;
            info!("Companion app initialized");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
