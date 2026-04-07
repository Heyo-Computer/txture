use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppState {
    pub storage_root: PathBuf,
    pub config_dir: PathBuf,
    pub artifacts_dir: PathBuf,
    pub data_dir: PathBuf,
    pub vm_name: Mutex<Option<String>>,
    /// Actual agent URL (e.g. "http://localhost:8080") when connected.
    pub agent_url: Mutex<Option<String>>,
    /// Running `heyvm port-forward` child process (fallback for old sandboxes without --open-port).
    pub port_forward_child: Mutex<Option<std::process::Child>>,
}

impl AppState {
    pub fn new() -> Self {
        let home = dirs::home_dir().expect("Could not determine home directory");
        let base = home.join(".todo");

        Self {
            storage_root: base.join("storage"),
            config_dir: base.join("config"),
            artifacts_dir: base.join("artifacts"),
            data_dir: base.clone(),
            vm_name: Mutex::new(None),
            agent_url: Mutex::new(None),
            port_forward_child: Mutex::new(None),
        }
    }

    pub fn ensure_dirs(&self) -> std::io::Result<()> {
        std::fs::create_dir_all(&self.storage_root)?;
        std::fs::create_dir_all(&self.config_dir)?;
        std::fs::create_dir_all(&self.artifacts_dir)?;
        Ok(())
    }

    pub fn kill_port_forward(&self) {
        if let Some(mut child) = self.port_forward_child.lock().unwrap().take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}
