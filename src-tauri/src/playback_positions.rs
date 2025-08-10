use regex::{Match, Regex};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use walkdir::{DirEntry, WalkDir};

#[tauri::command]
pub fn get_playback_positions(dir: &str) -> Result<Vec<HashMap<String, String>>, String> {
    let dir_exists = Path::new(&dir).try_exists().unwrap();
    if !dir_exists {
        return Err("Directory does not exist!".into());
    }
    let mut result = Vec::new();
    for entry in WalkDir::new(dir) {
        let entry = entry.unwrap();
        if !entry.file_type().is_file() {
            continue;
        }
        let position_info = parse_playback_entry(entry);
        result.push(position_info);
    }
    Ok(result.into())
}

fn parse_playback_entry(entry: DirEntry) -> HashMap<String, String> {
    let contents = fs::read_to_string(entry.path()).unwrap();
    let mut position_info = parse_playback_entry_contents(contents);

    let src_file_name = entry.file_name().to_os_string().into_string().unwrap();

    position_info.insert("src_file_name".to_string(), src_file_name);
    return position_info;
}

fn parse_playback_entry_contents(contents: String) -> HashMap<String, String> {
    let re = Regex::new(r"^(#\s+(?P<redirect>redirect entry)(\r\n|\r|\n|$))?(#\s+(?P<media_pathname>.*)(\r\n|\r|\n|$))?(\s*start=(?P<position>[\.\d]+)(\r\n|\r|\n|$))?")
        .unwrap();
    let caps = re.captures(&contents).unwrap();
    let media_pathname = get_re_match(caps.name("media_pathname"));
    let mut media_path = "".to_string();
    let mut media_filename = "".to_string();
    if media_pathname != "".to_string() {
        let path = Path::new(&media_pathname);
        media_path = match path.parent() {
            Some(p) => p.to_str().unwrap().to_string(),
            None => "".to_string(),
        };
        media_filename = match path.file_name() {
            Some(f) => f.to_os_string().into_string().unwrap(),
            None => "".to_string(),
        };
    }
    return HashMap::from([
        ("redirect".to_string(), get_re_match(caps.name("redirect"))),
        ("media_path".to_string(), media_path),
        ("media_filename".to_string(), media_filename),
        ("media_pathname".to_string(), media_pathname),
        ("position".to_string(), get_re_match(caps.name("position"))),
    ]);
}

fn get_re_match(m: Option<Match<'_>>) -> String {
    return match m {
        Some(m) => m.as_str().to_string(),
        None => "".to_string(),
    };
}
