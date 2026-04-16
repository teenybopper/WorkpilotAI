//! System tray setup — icon, context menu, and event handling.
//!
//! The tray icon indicates companion state:
//! - Gray: Idle / not listening
//! - Green: Actively listening & uploading
//! - Red: Error / disconnected

use log::info;
use tauri::{App, Manager};

/// Set up the system tray icon and menu.
pub fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    info!("System tray initialized");

    // NOTE: In Tauri v2, tray icons are configured via tauri.conf.json
    // and can be dynamically updated using app.tray_by_id().
    //
    // The tray menu would include:
    // - "WorkPilot Companion" (title, disabled)
    // - Separator
    // - "Start Listening" / "Stop Listening" (toggle)
    // - "Open Dashboard" (opens main window)
    // - "Settings" (audio device selection)
    // - Separator
    // - "Quit"
    //
    // Menu clicks are handled via:
    //   tray.on_menu_event(|app, event| { ... })
    //
    // Icon changes are done via:
    //   tray.set_icon(Some(icon)) / set_tooltip(...)

    Ok(())
}
