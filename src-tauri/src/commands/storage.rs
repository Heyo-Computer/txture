use tauri::State;
use crate::models::todo::{DayEntry, TodoItem};
use crate::services::storage as svc;
use crate::state::AppState;

#[tauri::command]
pub fn load_day(date: String, state: State<AppState>) -> DayEntry {
    svc::load_day(&state.storage_root, &date)
}

#[tauri::command]
pub fn get_days_range(state: State<AppState>) -> Vec<DayEntry> {
    svc::load_days_range(&state.storage_root)
}

#[tauri::command]
pub fn save_todo(date: String, title: String, state: State<AppState>) -> Result<DayEntry, String> {
    svc::add_todo(&state.storage_root, &date, &title)
}

#[tauri::command]
pub fn update_todo(date: String, todo: TodoItem, state: State<AppState>) -> Result<DayEntry, String> {
    svc::update_todo(&state.storage_root, &date, todo)
}

#[tauri::command]
pub fn delete_todo(date: String, todo_id: String, state: State<AppState>) -> Result<DayEntry, String> {
    svc::delete_todo(&state.storage_root, &date, &todo_id)
}

#[tauri::command]
pub fn load_spec(date: String, todo_id: String, state: State<AppState>) -> String {
    svc::load_spec(&state.storage_root, &date, &todo_id)
}

#[tauri::command]
pub fn save_spec(date: String, todo_id: String, content: String, state: State<AppState>) -> Result<(), String> {
    svc::save_spec(&state.storage_root, &date, &todo_id, &content)
}
