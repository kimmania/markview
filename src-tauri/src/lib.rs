use tauri::command;
use tauri_plugin_dialog::DialogExt;
use std::fs;

#[command]
async fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[command]
async fn pick_file(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    let file_path = app_handle.dialog().file().blocking_pick_file();
    Ok(file_path.map(|p| p.to_string()))
}

#[command]
async fn pick_folder(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    let folder_path = app_handle.dialog().file().blocking_pick_folder();
    Ok(folder_path.map(|p| p.to_string()))
}

#[command]
async fn read_dir(path: String) -> Result<Vec<String>, String> {
    let mut entries = Vec::new();
    let dir = fs::read_dir(&path).map_err(|e| e.to_string())?;
    for entry in dir {
        let entry = entry.map_err(|e| e.to_string())?;
        entries.push(entry.path().to_string_lossy().to_string());
    }
    Ok(entries)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .build(),
    )
    .invoke_handler(tauri::generate_handler![
      read_file,
      write_file,
      pick_file,
      pick_folder,
      read_dir,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
