// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_menu = Submenu::with_id_and_items(
                app,
                "app",
                "Hikma",
                true,
                &[
                    &PredefinedMenuItem::about(
                        app,
                        None,
                        Some(AboutMetadata {
                            name: Some("Hikma".to_string()),
                            version: Some(app.package_info().version.to_string()),
                            copyright: Some("© 2026 Hikma Team".to_string()),
                            comments: Some(format!(
                                "{}\n\n{}\n{}\n{}\n{}",
                                "A modern, polished Markdown editor.",
                                "    ╱|、",
                                "  (˚ˎ 。7",
                                "   |、˜〵",
                                "  じしˍ,)ノ"
                            )),
                            website: Some("https://github.com/HashDBrown/HIKMA".to_string()),
                            website_label: Some("GitHub Repository".to_string()),
                            icon: app.default_window_icon().cloned(),
                            ..Default::default()
                        }),
                    )?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::services(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::show_all(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?;

            let file_menu = Submenu::with_id_and_items(
                app,
                "file",
                "File",
                true,
                &[
                    &MenuItem::with_id(app, "new", "New", true, Some("CmdOrCtrl+N"))?,
                    &MenuItem::with_id(app, "open", "Open...", true, Some("CmdOrCtrl+O"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))?,
                    &MenuItem::with_id(app, "save_as", "Save As...", true, Some("CmdOrCtrl+Shift+S"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, None)?,
                ],
            )?;

            let edit_menu = Submenu::with_id_and_items(
                app,
                "edit",
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?;

            let insert_menu = Submenu::with_id_and_items(
                app,
                "insert",
                "Insert",
                true,
                &[
                    &MenuItem::with_id(app, "insert-code", "Code Block", true, Some("CmdOrCtrl+Alt+C"))?,
                    &MenuItem::with_id(app, "insert-table", "Table", true, Some("CmdOrCtrl+Alt+T"))?,
                    &MenuItem::with_id(app, "insert-image", "Image", true, Some("CmdOrCtrl+Alt+I"))?,
                    &MenuItem::with_id(app, "insert-link", "Link", true, Some("CmdOrCtrl+Alt+L"))?,
                    &MenuItem::with_id(app, "insert-rule", "Horizontal Rule", true, Some("CmdOrCtrl+Alt+H"))?,
                    &MenuItem::with_id(app, "insert-task", "Task List", true, Some("CmdOrCtrl+Alt+X"))?,
                    &MenuItem::with_id(app, "insert-quote", "Blockquote", true, Some("CmdOrCtrl+Alt+Q"))?,
                ],
            )?;

            let theme_menu = Submenu::with_id_and_items(
                app,
                "theme",
                "Theme",
                true,
                &[
                    &MenuItem::with_id(app, "theme-light", "Light", true, None::<&str>)?,
                    &MenuItem::with_id(app, "theme-dark", "Dark", true, None::<&str>)?,
                    &MenuItem::with_id(app, "theme-system", "System", true, None::<&str>)?,
                ],
            )?;

            let view_menu = Submenu::with_id_and_items(
                app,
                "view",
                "View",
                true,
                &[
                    &PredefinedMenuItem::fullscreen(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "reload", "Reload", true, Some("CmdOrCtrl+R"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &theme_menu,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "toggle_devtools", "Toggle Developer Tools", true, Some("CmdOrCtrl+Shift+I"))?,
                ],
            )?;

            let window_menu = Submenu::with_id_and_items(
                app,
                "window",
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, None)?,
                    &PredefinedMenuItem::maximize(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, None)?,
                ],
            )?;

            let help_menu = Submenu::with_id_and_items(
                app,
                "help",
                "Help",
                true,
                &[
                    &MenuItem::with_id(app, "learn_more", "Learn More", true, None::<&str>)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "github", "GitHub Repository", true, None::<&str>)?,
                    &MenuItem::with_id(app, "report_issue", "Report Issue", true, None::<&str>)?,
                ],
            )?;

            let menu = Menu::with_items(
                app,
                &[
                    &app_menu,
                    &file_menu,
                    &edit_menu,
                    &insert_menu,
                    &view_menu,
                    &window_menu,
                    &help_menu,
                ],
            )?;

            app.set_menu(menu)?;

            app.on_menu_event(move |app, event| {
                match event.id.as_ref() {
                    "new" => {
                        let _ = app.emit("menu-new", ());
                    }
                    "open" => {
                        let _ = app.emit("menu-open", ());
                    }
                    "save" => {
                        let _ = app.emit("menu-save", ());
                    }
                    "save_as" => {
                        let _ = app.emit("menu-save-as", ());
                    }
                    "reload" => {
                        let _ = app.get_webview_window("main").map(|w| w.reload());
                    }
                    "toggle_devtools" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_devtools_open() {
                                window.close_devtools();
                            } else {
                                window.open_devtools();
                            }
                        }
                    }
                    "learn_more" => {
                        let _ = app.emit("menu-learn-more", ());
                    }
                    "github" => {
                        let _ = app.emit("menu-github", ());
                    }
                    "report_issue" => {
                        let _ = app.emit("menu-report-issue", ());
                    }
                    "insert-code" => {
                        let _ = app.emit("menu-insert", "code");
                    }
                    "insert-table" => {
                        let _ = app.emit("menu-insert", "table");
                    }
                    "insert-image" => {
                        let _ = app.emit("menu-insert", "image");
                    }
                    "insert-link" => {
                        let _ = app.emit("menu-insert", "link");
                    }
                    "insert-rule" => {
                        let _ = app.emit("menu-insert", "rule");
                    }
                    "insert-task" => {
                        let _ = app.emit("menu-insert", "task");
                    }
                    "insert-quote" => {
                        let _ = app.emit("menu-insert", "quote");
                    }
                    "theme-light" => {
                        let _ = app.emit("menu-theme", "light");
                    }
                    "theme-dark" => {
                        let _ = app.emit("menu-theme", "dark");
                    }
                    "theme-system" => {
                        let _ = app.emit("menu-theme", "system");
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
