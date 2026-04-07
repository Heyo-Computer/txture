use tauri::State;
use crate::models::artifact::{Artifact, ArtifactIndex};
use crate::state::AppState;

fn load_index(state: &AppState) -> ArtifactIndex {
    let path = state.artifacts_dir.join(".index.json");
    if let Ok(content) = std::fs::read_to_string(&path) {
        serde_json::from_str(&content).unwrap_or_else(|_| ArtifactIndex::new())
    } else {
        ArtifactIndex::new()
    }
}

fn save_index(state: &AppState, index: &ArtifactIndex) -> Result<(), String> {
    let path = state.artifacts_dir.join(".index.json");
    let content = serde_json::to_string_pretty(index).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_artifacts(state: State<AppState>) -> Vec<Artifact> {
    load_index(&state).artifacts
}

#[tauri::command]
pub fn read_artifact(name: String, state: State<AppState>) -> Result<String, String> {
    let path = state.artifacts_dir.join(&name);
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read artifact: {}", e))
}

#[tauri::command]
pub fn save_artifact(name: String, content: String, state: State<AppState>) -> Result<Artifact, String> {
    let _ = std::fs::create_dir_all(&state.artifacts_dir);
    let path = state.artifacts_dir.join(&name);
    std::fs::write(&path, &content).map_err(|e| format!("Failed to write artifact: {}", e))?;

    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let artifact = Artifact {
        name: name.clone(),
        path: path.to_string_lossy().to_string(),
        size: metadata.len(),
        created_at: chrono::Local::now().to_rfc3339(),
    };

    let mut index = load_index(&state);
    index.artifacts.retain(|a| a.name != name);
    index.artifacts.push(artifact.clone());
    save_index(&state, &index)?;

    Ok(artifact)
}

#[tauri::command]
pub fn delete_artifact(name: String, state: State<AppState>) -> Result<(), String> {
    let path = state.artifacts_dir.join(&name);
    let _ = std::fs::remove_file(&path);

    let mut index = load_index(&state);
    index.artifacts.retain(|a| a.name != name);
    save_index(&state, &index)?;

    Ok(())
}
