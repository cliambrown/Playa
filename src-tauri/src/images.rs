use std::fs;
use std::path::Path;
use::tauri::AppHandle;
use trash;
use reqwest;
use image;
use image::ImageFormat;

#[tauri::command]
pub fn copy_local_image(
	app_handle: AppHandle,
	src_pathname: &str,
	new_filename: &str,
) -> Result<String, String> {
    let src_path = Path::new(&src_pathname);
    let file_exists = src_path.try_exists().unwrap();
    if !file_exists {
        return Err("File does not exist!".into())
    }
    let data_dir = app_handle.path_resolver().app_local_data_dir().unwrap();
    let dest_dir = Path::new(&data_dir).join("artworks");
    match fs::create_dir_all(&dest_dir) {
        Ok(_) => (),
        Err(error) => return Err(error.to_string().into())
    }
    let ext = src_path.extension().unwrap().to_str().unwrap();
    let new_filename_with_ext = format!("{new_filename}.{ext}");
    let dest_path = dest_dir.join(&new_filename_with_ext);
    let _result = match fs::copy(src_path, &dest_path) {
        Err(error) => return Err(error.to_string().into()),
        Ok(_r) => "success"
    };
    Ok(new_filename_with_ext.to_string().into())
}

#[tauri::command]
pub fn download_image(
    app_handle: AppHandle,
    src_url: &str,
    new_filename: &str,
) -> Result<String, String> {
    let data_dir = app_handle.path_resolver().app_local_data_dir().unwrap();
    let dest_dir = Path::new(&data_dir).join("artworks");
    match fs::create_dir_all(&dest_dir) {
        Ok(_) => (),
        Err(error) => return Err(error.to_string().into())
    }
    let img_get = match reqwest::blocking::get(src_url) {
        Ok(r) => r,
        Err(error) => return Err(error.to_string().into())
    };
    let img_bytes = match img_get.bytes() {
        Ok(r) => r,
        Err(error) => return Err(error.to_string().into())
    };
    let image = match image::load_from_memory(&img_bytes) {
        Ok(r) => r,
        Err(error) => return Err(error.to_string().into())
    };
    let img_format = match image::guess_format(&img_bytes) {
        Ok(r) => r,
        Err(error) => return Err(error.to_string().into())
    };
    let ext = match img_format {
        ImageFormat::Png => "png",
        ImageFormat::Jpeg => "jpg",
        ImageFormat::Gif => "gif",
        ImageFormat::WebP => "webp",
        _ => return Err("Invalid image format".into())
    };
    let new_filename_with_ext = format!("{new_filename}.{ext}");
    let dest_path = dest_dir.join(&new_filename_with_ext);
    match image.save(dest_path) {
        Ok(_r) => (),
        Err(error) => return Err(error.to_string().into())
    };
    Ok(new_filename_with_ext.into())
}

#[tauri::command]
pub fn delete_image(
	app_handle: AppHandle,
	delete_filename: Option<&str>,
) -> Result<String, String> {
    match delete_filename {
        Some(_f) => (),
        None => return Ok("Nothing to delete".into())
    }
    let data_dir = app_handle.path_resolver().app_local_data_dir().unwrap();
    let delete_path = Path::new(&data_dir)
        .join("artworks")
        .join(delete_filename.unwrap());
    match trash::delete(delete_path) {
        Ok(()) => return Ok("File deleted".into()),
        Err(error) => return Ok(error.to_string().into())
    }
}