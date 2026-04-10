use crate::logging;

const VISION_MODEL: &str = "mistral-large-2512";

/// Send an image + user prompt to Mistral's multimodal API and return the extracted text.
/// `image_base64` should be raw base64 (without `data:...;base64,` prefix); we wrap it as a data URL.
pub async fn describe_image(
    api_key: &str,
    image_base64: &str,
    media_type: &str,
    user_prompt: &str,
) -> Result<String, String> {
    logging::info(&format!(
        "vision::describe_image: media_type={}, image_len={}, prompt_len={}",
        media_type, image_base64.len(), user_prompt.len()
    ));

    let data_url = format!("data:{};base64,{}", media_type, image_base64);

    // Frame the prompt so Mistral extracts info actionable for a downstream agent
    let extraction_prompt = if user_prompt.trim().is_empty() {
        "Describe this image in detail. Extract any text, lists, diagrams, or structured information \
         that would be useful for further processing. Be thorough but concise."
            .to_string()
    } else {
        format!(
            "The user has shared this image with their AI assistant and asks: \"{}\"\n\n\
             Extract the relevant information from the image so the assistant can fulfill the request. \
             If the image contains a list, transcribe each item exactly. If it contains text, transcribe it. \
             If it contains a diagram or structure, describe the structure. \
             Return ONLY the extracted information — no preamble, no commentary on what the user should do.",
            user_prompt.replace('"', "'")
        )
    };

    let body = serde_json::json!({
        "model": VISION_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                { "type": "text", "text": extraction_prompt },
                { "type": "image_url", "image_url": data_url }
            ]
        }]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.mistral.ai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Mistral vision request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let msg = format!("Mistral vision error ({}): {}", status, text);
        logging::error(&msg);
        return Err(msg);
    }

    #[derive(serde::Deserialize)]
    struct ChatMessage {
        content: String,
    }

    #[derive(serde::Deserialize)]
    struct Choice {
        message: ChatMessage,
    }

    #[derive(serde::Deserialize)]
    struct ChatResponse {
        choices: Vec<Choice>,
    }

    let data: ChatResponse = resp.json().await
        .map_err(|e| format!("Failed to parse Mistral vision response: {}", e))?;

    let text = data.choices.into_iter().next()
        .map(|c| c.message.content)
        .ok_or("Mistral vision returned no choices")?;

    logging::info(&format!(
        "vision::describe_image: got '{}' ({} chars)",
        &text[..text.len().min(80)], text.len()
    ));
    Ok(text)
}
