mod api;

use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_positioner::{Position, WindowExt};

use crate::api::ApiServer;

const PANEL_LABEL: &str = "panel";
const PANEL_WIDTH: f64 = 320.0;
const PANEL_HEIGHT: f64 = 480.0;

const DASHBOARD_LABEL: &str = "dashboard";
const DASHBOARD_WIDTH: f64 = 1024.0;
const DASHBOARD_HEIGHT: f64 = 700.0;

const API_PORT: u16 = 5544;

#[tauri::command]
async fn api_status(api: tauri::State<'_, ApiServer>) -> Result<serde_json::Value, String> {
    let running = api.is_running().await;
    Ok(serde_json::json!({
        "running": running,
        "port": api.port(),
        "url": api.base_url(),
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let api_server = ApiServer::new(API_PORT);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_positioner::init())
        .manage(api_server)
        .invoke_handler(tauri::generate_handler![api_status])
        .setup(|app| {
            // Start API server (detect existing or spawn new)
            let api = app.state::<ApiServer>();
            let api_inner = api.inner().clone();
            tauri::async_runtime::spawn(async move {
                match api_inner.ensure_running().await {
                    Ok(spawned) => {
                        if spawned {
                            println!("Spawned kennel API server on port {}", API_PORT);
                        } else {
                            println!(
                                "Connected to existing kennel API server on port {}",
                                API_PORT
                            );
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to start API server: {}", e);
                    }
                }
            });

            // Build right-click context menu
            let open_dashboard_i =
                MenuItem::with_id(app, "open_dashboard", "Open Dashboard", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Kennel", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_dashboard_i, &quit_i])?;

            // Load tray icon
            let icon = Image::from_bytes(include_bytes!("../icons/tray-icon.png"))?;

            // Build tray icon
            let _tray = TrayIconBuilder::with_id("kennel-tray")
                .icon(icon)
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("Kennel — Service Manager")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open_dashboard" => {
                        open_dashboard_window(app);
                    }
                    "quit" => {
                        let api = app.state::<ApiServer>();
                        api.shutdown();
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

                    match event {
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } => {
                            toggle_panel(tray.app_handle());
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn toggle_panel(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(PANEL_LABEL) {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.move_window(Position::TrayCenter);
            let _ = window.show();
            let _ = window.set_focus();
        }
    } else {
        let url = WebviewUrl::App("index.html?layout=menubar".into());
        let panel = WebviewWindowBuilder::new(app, PANEL_LABEL, url)
            .title("Kennel")
            .inner_size(PANEL_WIDTH, PANEL_HEIGHT)
            .resizable(false)
            .decorations(false)
            .always_on_top(true)
            .visible(false)
            .skip_taskbar(true)
            .build();

        match panel {
            Ok(window) => {
                let _ = window.move_window(Position::TrayCenter);
                let _ = window.show();
                let _ = window.set_focus();

                let app_handle = app.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        if let Some(w) = app_handle.get_webview_window(PANEL_LABEL) {
                            let _ = w.hide();
                        }
                    }
                });
            }
            Err(e) => {
                eprintln!("Failed to create panel window: {}", e);
            }
        }
    }
}

fn open_dashboard_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(DASHBOARD_LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let url = WebviewUrl::App("index.html".into());
        match WebviewWindowBuilder::new(app, DASHBOARD_LABEL, url)
            .title("Kennel Dashboard")
            .inner_size(DASHBOARD_WIDTH, DASHBOARD_HEIGHT)
            .min_inner_size(800.0, 500.0)
            .resizable(true)
            .decorations(true)
            .center()
            .build()
        {
            Ok(_) => {}
            Err(e) => {
                eprintln!("Failed to create dashboard window: {}", e);
            }
        }
    }
}
