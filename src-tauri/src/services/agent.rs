use crate::models::agent::{AcpRequest, AcpResponse, AgentMessage};
use std::sync::atomic::{AtomicU64, Ordering};

static REQUEST_ID: AtomicU64 = AtomicU64::new(1);

fn next_id() -> u64 {
    REQUEST_ID.fetch_add(1, Ordering::Relaxed)
}

pub async fn send_rpc(
    agent_url: &str,
    method: &str,
    params: serde_json::Value,
) -> Result<AcpResponse, String> {
    let request = AcpRequest::new(method, params, next_id());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let response = client
        .post(format!("{}/rpc", agent_url))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("RPC request failed: {}", e))?;

    let acp_response: AcpResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse RPC response: {}", e))?;

    Ok(acp_response)
}

pub async fn send_chat_message(
    agent_url: &str,
    message: &str,
) -> Result<AgentMessage, String> {
    let params = serde_json::json!({
        "message": message,
    });

    let response = send_rpc(agent_url, "agent/chat", params).await?;

    if let Some(error) = response.error {
        return Err(error.message);
    }

    let result = response.result.ok_or("Empty response from agent")?;
    let msg: AgentMessage =
        serde_json::from_value(result).map_err(|e| format!("Failed to parse message: {}", e))?;

    Ok(msg)
}

pub async fn check_health(agent_url: &str) -> bool {
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
    {
        Ok(c) => c,
        Err(_) => return false,
    };

    client
        .get(format!("{}/health", agent_url))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}
