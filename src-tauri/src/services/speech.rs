use crate::logging;
use base64::Engine;

/// Transcribe audio using the OpenAI Whisper API.
/// Accepts base64-encoded audio data and a MIME type (e.g. "audio/webm").
pub async fn transcribe(api_key: &str, audio_base64: &str, media_type: &str) -> Result<String, String> {
    logging::info(&format!("speech::transcribe: media_type={}, audio_len={}", media_type, audio_base64.len()));

    let audio_bytes = base64::engine::general_purpose::STANDARD
        .decode(audio_base64)
        .map_err(|e| format!("Failed to decode audio: {}", e))?;

    logging::info(&format!("speech::transcribe: decoded {} bytes", audio_bytes.len()));

    let ext = match media_type {
        "audio/webm" => "webm",
        "audio/ogg" => "ogg",
        "audio/mp4" => "mp4",
        "audio/wav" => "wav",
        "audio/mpeg" => "mp3",
        _ => "webm",
    };

    let file_part = reqwest::multipart::Part::bytes(audio_bytes)
        .file_name(format!("recording.{}", ext))
        .mime_str(media_type)
        .map_err(|e| format!("Failed to create multipart: {}", e))?;

    let form = reqwest::multipart::Form::new()
        .text("model", "whisper-1")
        .part("file", file_part);

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Whisper API request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let msg = format!("Whisper API error ({}): {}", status, text);
        logging::error(&msg);
        return Err(msg);
    }

    #[derive(serde::Deserialize)]
    struct WhisperResponse {
        text: String,
    }

    let data: WhisperResponse = resp.json().await
        .map_err(|e| format!("Failed to parse Whisper response: {}", e))?;

    logging::info(&format!("speech::transcribe: result='{}' ({} chars)", &data.text[..data.text.len().min(80)], data.text.len()));
    Ok(data.text)
}
