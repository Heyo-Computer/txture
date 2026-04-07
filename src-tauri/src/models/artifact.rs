use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Artifact {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactIndex {
    pub artifacts: Vec<Artifact>,
}

impl ArtifactIndex {
    pub fn new() -> Self {
        Self {
            artifacts: Vec::new(),
        }
    }
}
