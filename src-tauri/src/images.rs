// use std::fs;
use std::path::Path;
use::tauri::AppHandle;
// use api::path::resource_dir;

#[tauri::command]
pub fn copy_local_image(
	app_handle: AppHandle,
	src_pathname: &str,
	current_banner_pathnames: Vec<&str>
) -> Result<String, String> {
    let src_path = Path::new(&src_pathname);
    let file_exists = src_path.try_exists().unwrap();
    if !file_exists {
        return Err("File does not exist!".into())
    }
    let data_dir = app_handle.path_resolver().app_local_data_dir().unwrap();
    let dest_path = Path::new(&data_dir);
    // fs::copy(src_path, dest_path);
    Ok(data_dir.to_str().unwrap().to_string().into())
}