use ::tauri::AppHandle;
use tauri::Emitter;

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, serde::Serialize)]
struct Payload {
    message: String,
}

pub fn emit_global(app_handle: &AppHandle, event_name: &str, msg: &str) {
    app_handle
        .emit(
            &event_name,
            Payload {
                message: msg.into(),
            },
        )
        .unwrap();
}
