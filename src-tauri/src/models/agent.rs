use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcpRequest {
    pub jsonrpc: String,
    pub method: String,
    pub params: serde_json::Value,
    pub id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcpResponse {
    pub jsonrpc: String,
    pub result: Option<serde_json::Value>,
    pub error: Option<AcpError>,
    pub id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcpError {
    pub code: i64,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

impl AcpRequest {
    pub fn new(method: &str, params: serde_json::Value, id: u64) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            method: method.to_string(),
            params,
            id,
        }
    }
}
