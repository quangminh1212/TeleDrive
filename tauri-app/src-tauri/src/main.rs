// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::process::{Command, Child};
use std::sync::Mutex;

struct AppState {
    python_process: Mutex<Option<Child>>,
}

#[tauri::command]
fn start_python_server(state: tauri::State<AppState>) -> Result<String, String> {
    let mut process_guard = state.python_process.lock().unwrap();
    
    if process_guard.is_some() {
        return Ok("Server already running".to_string());
    }

    // Start Python Flask server
    let child = Command::new("python")
        .arg("main.py")
        .current_dir("../..")
        .spawn()
        .map_err(|e| format!("Failed to start Python server: {}", e))?;

    *process_guard = Some(child);
    Ok("Server started successfully".to_string())
}

#[tauri::command]
fn stop_python_server(state: tauri::State<AppState>) -> Result<String, String> {
    let mut process_guard = state.python_process.lock().unwrap();
    
    if let Some(mut child) = process_guard.take() {
        child.kill().map_err(|e| format!("Failed to stop server: {}", e))?;
        Ok("Server stopped successfully".to_string())
    } else {
        Ok("Server not running".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            python_process: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            start_python_server,
            stop_python_server
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            // Start Python server automatically
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                std::thread::sleep(std::time::Duration::from_secs(1));
                // Python server will be started by the frontend
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
