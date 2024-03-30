// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod playback_positions;
pub mod scanner;
pub mod emitter;

use trash;
use std::path::Path;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn trash_files(dir: &str, filenames: Vec<&str>) -> String {
    let pathnames = filenames.iter().map(|&filename| Path::new(dir).join(filename)).collect::<Vec<_>>();
    let mut result = "Files deleted".to_string();
    trash::delete_all(&pathnames).unwrap_or_else(|error| {
        result = error.to_string();
    });
    return result;
}

#[tauri::command]
fn get_home_dir() -> String {
    return tauri::api::path::home_dir().unwrap()
        .into_os_string().into_string().unwrap();
}

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, serde::Serialize)]
struct Payload {
    message: String,
}

fn main() {
    
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("./create_initial_tables.sql"),
            kind: MigrationKind::Up,
        },
    ];
    
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:playa.db", migrations)
            .build()
        )
        .setup(|app| {
            // `main` here is the window label; it is defined on the window creation or under `tauri.conf.json`
            // the default value is `main`. note that it must be unique
            let window = app.get_window("main").unwrap();

            // listen to the `event-name` (emitted on the `main` window)
            let id = window.listen("event-name", |event| {
            println!("got window event-name with payload {:?}", event.payload());
            });
            // unlisten to the event using the `id` returned on the `listen` function
            // an `once` API is also exposed on the `Window` struct
            window.unlisten(id);

            // emit the `event-name` event to the `main` window
            window.emit("event-name", Payload { message: "Tauri is awesome!".into() }).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
                playback_positions::get_playback_positions,
                scanner::scan_shows,
                scanner::scan_movies,
                trash_files,
                get_home_dir
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
