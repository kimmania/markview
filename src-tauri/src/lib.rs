use tauri::command;
use tauri_plugin_dialog::DialogExt;
use std::fs;
use std::path::Path;
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct FileEntry {
    path: String,
    name: String,
    is_dir: bool,
    children: Vec<FileEntry>,
}

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

fn scan_dir_recursive<P: AsRef<Path>>(dir: P) -> Result<Vec<FileEntry>, String> {
    let path = dir.as_ref();
    let mut entries = Vec::new();
    let dir_iter = fs::read_dir(path).map_err(|e| e.to_string())?;
    
    for entry in dir_iter {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let name = entry_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        let is_dir = entry_path.is_dir();
        
        // Skip hidden files and directories
        if name.starts_with('.') {
            continue;
        }
        
        let children = if is_dir {
            match scan_dir_recursive(&entry_path) {
                Ok(c) => c,
                Err(_) => Vec::new(),
            }
        } else {
            Vec::new()
        };
        
        // Only include directories and .md files
        if is_dir || name.ends_with(".md") {
            entries.push(FileEntry {
                path: entry_path.to_string_lossy().to_string(),
                name,
                is_dir,
                children,
            });
        }
    }
    
    // Sort: directories first, then files, alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    Ok(entries)
}

#[command]
async fn scan_vault(path: String) -> Result<Vec<FileEntry>, String> {
    scan_dir_recursive(&path)
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
      scan_vault,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
