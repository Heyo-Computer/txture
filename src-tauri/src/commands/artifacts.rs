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

/// Scan the artifacts directory directly. The disk is the source of truth so files
/// created by any means (save_artifact tool, raw write_file, manual placement) show up.
#[tauri::command]
pub fn list_artifacts(state: State<AppState>) -> Vec<Artifact> {
    let dir = &state.artifacts_dir;
    if !dir.exists() {
        return Vec::new();
    }

    // Build a quick lookup of metadata from the index for created_at preservation
    let index = load_index(&state);
    let mut from_index: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for a in &index.artifacts {
        from_index.insert(a.name.clone(), a.created_at.clone());
    }

    let mut artifacts: Vec<Artifact> = Vec::new();
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return Vec::new(),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        // Skip the index file itself and any other dotfiles
        if name.starts_with('.') {
            continue;
        }
        let metadata = match std::fs::metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };
        let created_at = from_index.get(&name).cloned().unwrap_or_else(|| {
            // Fall back to filesystem mtime
            metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| {
                    chrono::DateTime::<chrono::Local>::from(
                        std::time::UNIX_EPOCH + d
                    ).to_rfc3339()
                })
                .unwrap_or_default()
        });
        artifacts.push(Artifact {
            name,
            path: path.to_string_lossy().to_string(),
            size: metadata.len(),
            created_at,
        });
    }

    // Sort newest first by created_at
    artifacts.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    artifacts
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
