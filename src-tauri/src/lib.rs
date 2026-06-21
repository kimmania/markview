use tauri::{command, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
use std::fs;
use std::path::Path;
use serde::Serialize;
use std::ptr::NonNull;
use objc2::MainThreadMarker;
use objc2_foundation::{NSData, NSError};
use objc2_web_kit::WKWebView;

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

#[command]
async fn save_file_dialog(
    app_handle: tauri::AppHandle,
    _default_name: String,
) -> Result<Option<String>, String> {
    let file_path = app_handle
        .dialog()
        .file()
        .add_filter("Markdown", &["md"])
        .blocking_save_file();
    Ok(file_path.map(|p| p.to_string()))
}

#[command]
async fn print_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| e.to_string())
}

#[command]
async fn export_pdf(
    window: tauri::WebviewWindow,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel::<Result<Vec<u8>, String>>();

    window.with_webview(move |webview| {
        let inner = webview.inner();
        let wk: &WKWebView = unsafe { &*(inner as *mut WKWebView) };

        let mtm = MainThreadMarker::new().expect("must be on main thread");
        let config = unsafe { objc2_web_kit::WKPDFConfiguration::new(mtm) };

        let block = block2::RcBlock::new(move |data: *mut NSData, error: *mut NSError| {
            let result = if !error.is_null() {
                Err("PDF generation failed".to_string())
            } else if !data.is_null() {
                let nsdata = unsafe { &*data };
                let len = nsdata.length();
                let mut buf = vec![0u8; len as usize];
                let ptr = NonNull::new(buf.as_mut_ptr() as *mut std::ffi::c_void).unwrap();
                unsafe { nsdata.getBytes_length(ptr, len) };
                Ok(buf)
            } else {
                Err("No PDF data received".to_string())
            };
            let _ = tx.send(result);
        });

        unsafe {
            wk.createPDFWithConfiguration_completionHandler(Some(&config), &block);
        }
    }).map_err(|e| e.to_string())?;

    let pdf_bytes = rx.recv().map_err(|e| e.to_string())??;

    let path = app_handle
        .dialog()
        .file()
        .add_filter("PDF", &["pdf"])
        .blocking_save_file();

    if let Some(path) = path {
        let path_str = path.to_string();
        std::fs::write(&path_str, pdf_bytes).map_err(|e| e.to_string())?;
        Ok(path_str)
    } else {
        Err("Save cancelled".to_string())
    }
}

#[command]
async fn get_settings(app_handle: tauri::AppHandle) -> Result<String, String> {
    let config_dir = app_handle.path().app_config_dir().map_err(|e| e.to_string())?;
    let settings_path = config_dir.join("settings.json");
    if !settings_path.exists() {
        return Ok(String::from("{}"));
    }
    fs::read_to_string(&settings_path).map_err(|e| e.to_string())
}

#[command]
async fn set_settings(app_handle: tauri::AppHandle, settings_json: String) -> Result<(), String> {
    let config_dir = app_handle.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    let settings_path = config_dir.join("settings.json");
    fs::write(&settings_path, settings_json).map_err(|e| e.to_string())
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
    .setup(|app| {
      use tauri::menu::*;
      
      // File menu
      let open_vault = MenuItemBuilder::new("Open Vault")
        .id("open_vault")
        .accelerator("CmdOrCtrl+Shift+O")
        .build(app)?;
      let new_file = MenuItemBuilder::new("New File")
        .id("new_file")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
      let save = MenuItemBuilder::new("Save")
        .id("save")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
      let save_as = MenuItemBuilder::new("Save As…")
        .id("save_as")
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app)?;
      let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      
      let file_menu = SubmenuBuilder::new(app, "File")
        .item(&new_file)
        .item(&open_vault)
        .separator()
        .item(&save)
        .item(&save_as)
        .separator()
        .item(&quit)
        .build()?;
      
      // Edit menu
      let find = MenuItemBuilder::new("Find")
        .id("find")
        .accelerator("CmdOrCtrl+F")
        .build(app)?;
      let replace = MenuItemBuilder::new("Replace")
        .id("replace")
        .accelerator("CmdOrCtrl+H")
        .build(app)?;
      let undo = PredefinedMenuItem::undo(app, None)?;
      let redo = PredefinedMenuItem::redo(app, None)?;
      let cut = PredefinedMenuItem::cut(app, None)?;
      let copy = PredefinedMenuItem::copy(app, None)?;
      let paste = PredefinedMenuItem::paste(app, None)?;
      let select_all = PredefinedMenuItem::select_all(app, None)?;
      
      let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&undo)
        .item(&redo)
        .separator()
        .item(&cut)
        .item(&copy)
        .item(&paste)
        .separator()
        .item(&select_all)
        .separator()
        .item(&find)
        .item(&replace)
        .build()?;
      
      // View menu
      let toggle_sidebar = MenuItemBuilder::new("Toggle Sidebar")
        .id("toggle_sidebar")
        .accelerator("CmdOrCtrl+B")
        .build(app)?;
      let toggle_dark = MenuItemBuilder::new("Toggle Dark Mode")
        .id("toggle_dark")
        .accelerator("CmdOrCtrl+Shift+D")
        .build(app)?;
      let cycle_view = MenuItemBuilder::new("Cycle View Mode")
        .id("cycle_view")
        .accelerator("CmdOrCtrl+\\")
        .build(app)?;
      
      let view_menu = SubmenuBuilder::new(app, "View")
        .item(&toggle_sidebar)
        .item(&cycle_view)
        .separator()
        .item(&toggle_dark)
        .build()?;
      
      // Window menu
      let minimize = MenuItem::with_id(app, "minimize", "Minimize", true, Some("CmdOrCtrl+M"))?;
      let zoom = MenuItem::with_id(app, "zoom", "Zoom", true, None::<&str>)?;
      
      let window_menu = SubmenuBuilder::new(app, "Window")
        .item(&minimize)
        .item(&zoom)
        .build()?;
      
      let menu = MenuBuilder::new(app)
        .items(&[&file_menu, &edit_menu, &view_menu, &window_menu])
        .build()?;
      
      app.set_menu(menu)?;
      
      // Handle menu clicks
      app.on_menu_event(|app, event| {
        let id = event.id().0.as_str();
        match id {
          "quit" => {
            app.exit(0);
          }
          _ => {
            // Emit to frontend; let JS handle the rest
            let _ = app.emit("menu_click", id);
          }
        }
      });
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      read_file,
      write_file,
      pick_file,
      pick_folder,
      read_dir,
      scan_vault,
      save_file_dialog,
      print_window,
      export_pdf,
      get_settings,
      set_settings,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
