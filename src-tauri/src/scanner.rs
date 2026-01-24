use crate::emitter::emit_global;
use ::tauri::AppHandle;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
// use tauri::api::process::{Command, CommandEvent};
// use tauri::async_runtime::block_on;
// use tauri_plugin_shell::process::CommandEvent;
// use tauri_plugin_shell::ShellExt;
use walkdir::WalkDir;

const VIDEO_MIMES: [&str; 9] = [
    "video/mp4",
    "video/x-m4v",
    "video/x-matroska",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-ms-wmv",
    "video/mpeg",
    "video/x-flv",
];

#[tauri::command(async)]
pub async fn scan_shows(
    app_handle: AppHandle,
    tv_dir: String,
) -> Result<HashMap<String, Vec<HashMap<String, String>>>, String> {
    let dir_exists = Path::new(&tv_dir).try_exists().unwrap();
    if !dir_exists {
        return Err("Directory does not exist!".into());
    }

    let mut show_dir_names = Vec::new();
    let mut episode_files: Vec<HashMap<String, String>> = Vec::new();
    let entries = match fs::read_dir(tv_dir) {
        Ok(r) => r,
        Err(error) => return Err(error.to_string().into()),
    };
    for show_entry in entries {
        let show_entry = show_entry.unwrap();
        let mut found_episodes = false;
        if !show_entry.file_type().unwrap().is_dir() {
            continue;
        }
        let show_dir_name = show_entry.file_name().to_os_string().into_string().unwrap();
        for ep_entry in WalkDir::new(show_entry.path()) {
            let ep_entry = ep_entry.unwrap();
            if !ep_entry.file_type().is_file() {
                continue;
            }
            let path = ep_entry.path();
            emit_global(
                &app_handle,
                "loading-event",
                ("Scanning ".to_owned() + path.to_str().unwrap()).as_str(),
            );
            let kind = match infer::get_from_path(path) {
                Ok(opt) => match opt {
                    Some(k) => k,
                    None => continue,
                },
                Err(_error) => continue,
            };
            if !VIDEO_MIMES.contains(&kind.mime_type()) {
                continue;
            }
            let filename = ep_entry.file_name().to_os_string().into_string().unwrap();
            episode_files.push(HashMap::from([
                ("show_dir_name".to_string(), show_dir_name.clone()),
                ("filename".to_string(), filename),
                ("pathname".to_string(), path.to_str().unwrap().to_string()),
            ]));
            found_episodes = true;
        }
        if found_episodes {
            show_dir_names.push(HashMap::from([(
                "show_dir_name".to_string(),
                show_dir_name.clone(),
            )]));
        }
    }
    let result: HashMap<String, Vec<HashMap<String, String>>> = HashMap::from([
        ("show_dir_names".to_string(), show_dir_names),
        ("episode_files".to_string(), episode_files),
    ]);
    Ok(result.into())
}

#[tauri::command(async)]
pub async fn scan_movies(
    app_handle: AppHandle,
    movie_dir: String,
) -> Result<Vec<HashMap<String, String>>, String> {
    let dir_exists = Path::new(&movie_dir).try_exists().unwrap();
    if !dir_exists {
        return Err("Directory does not exist!".into());
    }

    let mut movie_files: Vec<HashMap<String, String>> = Vec::new();
    for entry in WalkDir::new(movie_dir) {
        let entry = entry.unwrap();
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        emit_global(&app_handle, "loading-event", path.to_str().unwrap());
        emit_global(
            &app_handle,
            "loading-event",
            ("Scanning ".to_owned() + path.to_str().unwrap()).as_str(),
        );
        let kind = match infer::get_from_path(path) {
            Ok(opt) => match opt {
                Some(k) => k,
                None => continue,
            },
            Err(_error) => continue,
        };
        if !VIDEO_MIMES.contains(&kind.mime_type()) {
            continue;
        }
        let filename = entry.file_name().to_os_string().into_string().unwrap();
        movie_files.push(HashMap::from([
            ("filename".to_string(), filename),
            ("pathname".to_string(), path.to_str().unwrap().to_string()),
        ]));
    }
    Ok(movie_files.into())
}
