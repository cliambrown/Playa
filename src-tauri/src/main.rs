// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod playback_positions;
pub mod scanner;
pub mod emitter;
pub mod images;

use std::fs;
use std::process::Command;
use std::path::Path;
use tauri_plugin_sql::{Migration, MigrationKind};
use trash;

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

// https://github.com/tauri-apps/plugins-workspace/issues/999#issuecomment-1965624567
#[tauri::command]
fn show_in_folder(path: String) -> Result<(), String> {
    Command::new("explorer")
        .args(["/select,", &path]) // The comma after select is not a typo
        .spawn()
        .map_err(|e| e.to_string())?;
  Ok(())
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
        .invoke_handler(tauri::generate_handler![
                playback_positions::get_playback_positions,
                scanner::get_duration,
                scanner::scan_shows,
                scanner::scan_movies,
                images::copy_local_image,
                images::download_image,
                images::delete_image,
                images::delete_unused_images,
                trash_files,
                get_home_dir,
                show_in_folder
            ])
        .setup(|app| {
            // Create artworks folder if not created
            let data_dir = app.path_resolver()
                .app_local_data_dir().unwrap();
            let dest_dir = Path::new(&data_dir).join("artworks");
            match fs::create_dir_all(&dest_dir) {
                Ok(_) => (),
                Err(_error) => ()
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
