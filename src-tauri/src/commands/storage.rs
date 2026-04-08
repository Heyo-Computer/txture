use tauri::State;
use crate::models::todo::{DayEntry, TodoItem};
use crate::services::storage as svc;
use crate::services::agent as agent_svc;
use crate::state::AppState;

/// Get the agent URL if connected, or None for local fallback.
fn agent_url(state: &AppState) -> Option<String> {
    state.agent_url.lock().unwrap().clone()
}

/// Call an agent RPC and parse the result, returning Err if the agent is down.
async fn agent_rpc<T: serde::de::DeserializeOwned>(
    url: &str,
    method: &str,
    params: serde_json::Value,
) -> Result<T, String> {
    let resp = agent_svc::send_rpc(url, method, params).await?;
    if let Some(err) = resp.error {
        return Err(err.message);
    }
    let result = resp.result.ok_or("Empty response from agent")?;
    serde_json::from_value(result).map_err(|e| format!("Failed to parse: {}", e))
}

#[tauri::command]
pub async fn load_day(date: String, state: State<'_, AppState>) -> Result<DayEntry, String> {
    if let Some(url) = agent_url(&state) {
        return agent_rpc(&url, "storage/load_day", serde_json::json!({ "date": date })).await;
    }
    Ok(svc::load_day(&state.storage_root, &date))
}

#[tauri::command]
pub async fn get_days_range(state: State<'_, AppState>) -> Result<Vec<DayEntry>, String> {
    if let Some(url) = agent_url(&state) {
        return agent_rpc(&url, "storage/load_days_range", serde_json::json!({})).await;
    }
    Ok(svc::load_days_range(&state.storage_root))
}

#[tauri::command]
pub async fn save_todo(date: String, title: String, state: State<'_, AppState>) -> Result<DayEntry, String> {
    if let Some(url) = agent_url(&state) {
        return agent_rpc(&url, "storage/add_todo", serde_json::json!({ "date": date, "title": title })).await;
    }
    svc::add_todo(&state.storage_root, &date, &title)
}

#[tauri::command]
pub async fn update_todo(date: String, todo: TodoItem, state: State<'_, AppState>) -> Result<DayEntry, String> {
    if let Some(url) = agent_url(&state) {
        return agent_rpc(&url, "storage/update_todo", serde_json::json!({ "date": date, "todo": todo })).await;
    }
    svc::update_todo(&state.storage_root, &date, todo)
}

#[tauri::command]
pub async fn delete_todo(date: String, todo_id: String, state: State<'_, AppState>) -> Result<DayEntry, String> {
    if let Some(url) = agent_url(&state) {
        return agent_rpc(&url, "storage/delete_todo", serde_json::json!({ "date": date, "todo_id": todo_id })).await;
    }
    svc::delete_todo(&state.storage_root, &date, &todo_id)
}

#[tauri::command]
pub async fn load_spec(date: String, todo_id: String, state: State<'_, AppState>) -> Result<String, String> {
    if let Some(url) = agent_url(&state) {
        return agent_rpc(&url, "storage/load_spec", serde_json::json!({ "date": date, "todo_id": todo_id })).await;
    }
    Ok(svc::load_spec(&state.storage_root, &date, &todo_id))
}

#[tauri::command]
pub async fn save_spec(date: String, todo_id: String, content: String, state: State<'_, AppState>) -> Result<(), String> {
    if let Some(url) = agent_url(&state) {
        let _: serde_json::Value = agent_rpc(&url, "storage/save_spec", serde_json::json!({
            "date": date,
            "todo_id": todo_id,
            "content": content,
        })).await?;
        return Ok(());
    }
    svc::save_spec(&state.storage_root, &date, &todo_id, &content)
}
