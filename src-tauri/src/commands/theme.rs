use tauri::State;
use crate::state::AppState;

#[derive(serde::Serialize, serde::Deserialize)]
struct ThemeConfig {
    name: String,
}

#[tauri::command]
pub fn get_theme(state: State<AppState>) -> String {
    let path = state.config_dir.join("theme.json");
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(config) = serde_json::from_str::<ThemeConfig>(&content) {
            return config.name;
        }
    }
    "dark".to_string()
}

#[tauri::command]
pub fn set_theme(theme_name: String, state: State<AppState>) -> Result<(), String> {
    let _ = std::fs::create_dir_all(&state.config_dir);
    let path = state.config_dir.join("theme.json");
    let config = ThemeConfig { name: theme_name };
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}
