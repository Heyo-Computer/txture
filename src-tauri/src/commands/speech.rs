use tauri::State;
use crate::state::AppState;
use crate::logging;

#[tauri::command]
pub async fn transcribe_audio(
    audio_data: String,
    media_type: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let config = super::config::AgentConfig::default_from_disk(&state.config_dir);

    if config.speech_api_key.is_empty() {
        return Err("No speech API key configured. Add your OpenAI API key under Speech in Settings.".to_string());
    }

    logging::info(&format!("transcribe_audio: {} bytes base64, type={}", audio_data.len(), media_type));

    let result = crate::services::speech::transcribe(&config.speech_api_key, &audio_data, &media_type).await?;

    logging::info(&format!("transcribe_audio: got '{}' ({} chars)", &result[..result.len().min(80)], result.len()));
    Ok(result)
}
