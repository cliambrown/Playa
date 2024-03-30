use::tauri::{AppHandle, Manager};

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, serde::Serialize)]
struct Payload {
    message: String,
}

pub fn emit_global(app_handle: &AppHandle, event_name: &str, msg: &str) {
    app_handle.emit_all(&event_name, Payload { message: msg.into() }).unwrap();
}