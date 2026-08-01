//! System tray setup — icon, context menu, and event handling.
//!
//! The tray icon indicates companion state:
//! - Gray: Idle / not listening
//! - Green: Actively listening & uploading
//! - Red: Error / disconnected

use log::info;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::TrayIconEvent,
    App, Manager,
};

/// Set up the system tray icon and menu.
pub fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // Build the tray context menu
    let show_item = MenuItemBuilder::with_id("show", "Open WorkPilot Companion").build(app)?;
    let feedback_item =
        MenuItemBuilder::with_id("feedback", "Report Bug / Feedback").build(app)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&show_item, &feedback_item, &separator, &quit_item])
        .build()?;

    // Attach the menu to the tray icon
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu))?;
        tray.set_tooltip(Some("WorkPilot Companion — On-Device Audio Capture"))?;

        tray.on_menu_event(move |app, event| match event.id().as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "feedback" => {
                let _ = open::that("https://github.com/teenybopper/workpilotAI/issues");
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        });
    }

    info!("System tray initialized with menu");
    Ok(())
}
