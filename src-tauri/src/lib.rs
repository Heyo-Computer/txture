mod commands;
mod logging;
mod models;
mod services;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new();
    app_state.ensure_dirs().expect("Failed to create app directories");
    logging::init(&app_state.data_dir);
    logging::info("Application starting");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .manage(app_state)
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                commands::agent::auto_start_agent(handle).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Storage
            commands::storage::load_day,
            commands::storage::get_days_range,
            commands::storage::save_todo,
            commands::storage::update_todo,
            commands::storage::delete_todo,
            commands::storage::load_spec,
            commands::storage::save_spec,
            // Theme
            commands::theme::get_theme,
            commands::theme::set_theme,
            // heyvm
            commands::heyvm::create_vm,
            commands::heyvm::start_vm,
            commands::heyvm::stop_vm,
            commands::heyvm::vm_status,
            commands::heyvm::snapshot_vm,
            // Agent
            commands::agent::setup_agent,
            commands::agent::start_agent,
            commands::agent::stop_agent,
            commands::agent::send_message,
            commands::agent::agent_status,
            commands::agent::get_chat_history,
            // Artifacts
            commands::artifacts::list_artifacts,
            commands::artifacts::read_artifact,
            commands::artifacts::save_artifact,
            commands::artifacts::delete_artifact,
            // Config
            commands::config::get_agent_config,
            commands::config::set_agent_config,
            commands::config::get_status_info,
            commands::config::get_recent_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
