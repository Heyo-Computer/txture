use std::process::Command;
use crate::logging;

fn heyvm_cmd() -> Command {
    Command::new("heyvm")
}

fn run(label: &str, cmd: &mut Command) -> Result<String, String> {
    let display = format!("{:?}", cmd);
    logging::info(&format!("[heyvm] {}: running {}", label, display));

    let output = cmd.output().map_err(|e| {
        let msg = format!("[heyvm] {}: spawn failed: {}", label, e);
        logging::error(&msg);
        msg
    })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        logging::info(&format!("[heyvm] {}: exit 0, stdout={}", label, stdout.trim()));
        Ok(stdout)
    } else {
        let msg = format!(
            "[heyvm] {}: exit {}, stderr={}",
            label,
            output.status.code().unwrap_or(-1),
            stderr.trim()
        );
        logging::error(&msg);
        Err(format!("{}: {}", label, stderr.trim()))
    }
}

// ── Sandbox lifecycle ──

pub fn list_sandboxes() -> Result<String, String> {
    run("list", heyvm_cmd().arg("list"))
}

pub fn sandbox_exists(name: &str) -> bool {
    match list_sandboxes() {
        Ok(output) => output.contains(name),
        Err(_) => false,
    }
}

#[derive(serde::Deserialize)]
pub struct PortMapping {
    pub host_port: u16,
    pub guest_port: u16,
}

#[derive(serde::Deserialize)]
pub struct CreateResult {
    pub id: String,
    pub name: String,
    pub status: String,
    #[serde(default)]
    pub port_mappings: Vec<PortMapping>,
}

/// Port spec for --open-port: (host_port, guest_port). Use (0, guest) for dynamic host port.
pub type PortSpec = (u16, u16);

pub fn create_sandbox_with_backend(
    name: &str,
    backend: &str,
    data_dir: &str,
    image: Option<&str>,
    open_ports: &[PortSpec],
) -> Result<CreateResult, String> {
    logging::info(&format!("[heyvm] create_sandbox: name={}, backend={}, data_dir={}, image={:?}, open_ports={:?}",
        name, backend, data_dir, image, open_ports));
    let mut cmd = heyvm_cmd();
    cmd.args([
        "create",
        "--format", "json",
        "--name", name,
        "--backend-type", backend,
        "--type", "shell",
        "--mount", &format!("{}:/data", data_dir),
    ]);
    if let Some(img) = image {
        cmd.args(["--image", img]);
    }
    for (host, guest) in open_ports {
        let spec = if *host == 0 {
            guest.to_string()
        } else {
            format!("{}:{}", host, guest)
        };
        cmd.args(["--open-port", &spec]);
    }
    let raw = run("create", &mut cmd)?;
    serde_json::from_str(raw.trim())
        .map_err(|e| format!("create: failed to parse output: {} (raw: {})", e, raw.trim()))
}

pub fn start_sandbox(name: &str) -> Result<String, String> {
    run("start", heyvm_cmd().args(["start", name]))
}

pub fn stop_sandbox(name: &str) -> Result<String, String> {
    run("stop", heyvm_cmd().args(["stop", name]))
}

// ── Exec ──

pub fn exec_in_sandbox(name: &str, cmd: &[&str]) -> Result<String, String> {
    let mut args = vec!["exec", "--stdout-only", name, "--"];
    args.extend_from_slice(cmd);
    logging::info(&format!("[heyvm] exec: sandbox={}, cmd={:?}", name, cmd));
    run("exec", heyvm_cmd().args(&args))
}

pub struct ExecOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Execute a command with structured JSON output and optional timeout.
pub fn exec_in_sandbox_json(name: &str, cmd: &[&str], timeout: Option<&str>) -> Result<ExecOutput, String> {
    let mut args = vec!["exec", "--format", "json"];
    if let Some(t) = timeout {
        args.extend_from_slice(&["--timeout", t]);
    }
    args.push(name);
    args.push("--");
    args.extend_from_slice(cmd);
    logging::info(&format!("[heyvm] exec_json: sandbox={}, cmd={:?}, timeout={:?}", name, cmd, timeout));

    let raw = run("exec_json", heyvm_cmd().args(&args))?;

    #[derive(serde::Deserialize)]
    struct JsonOut {
        stdout: String,
        stderr: String,
        exit_code: i32,
    }

    let parsed: JsonOut = serde_json::from_str(raw.trim())
        .map_err(|e| format!("exec_json: failed to parse output: {} (raw: {})", e, raw.trim()))?;

    if parsed.exit_code != 0 {
        logging::warn(&format!("[heyvm] exec_json: exit_code={}, stderr={}", parsed.exit_code, parsed.stderr.trim()));
    }

    Ok(ExecOutput {
        stdout: parsed.stdout,
        stderr: parsed.stderr,
        exit_code: parsed.exit_code,
    })
}

// ── wait-for ──

pub struct WaitForResult {
    pub port: u16,
    pub ready: bool,
}

pub fn wait_for(name: &str, port: u16, timeout: Option<&str>, path: Option<&str>) -> Result<WaitForResult, String> {
    let mut cmd = heyvm_cmd();
    cmd.args(["wait-for", "--format", "json", name, &port.to_string()]);
    if let Some(t) = timeout {
        cmd.args(["--timeout", t]);
    }
    if let Some(p) = path {
        cmd.args(["--path", p]);
    }
    let raw = run("wait-for", &mut cmd)?;

    #[derive(serde::Deserialize)]
    struct JsonOut {
        port: u16,
        ready: bool,
    }

    let parsed: JsonOut = serde_json::from_str(raw.trim())
        .map_err(|e| format!("wait-for: failed to parse output: {} (raw: {})", e, raw.trim()))?;

    Ok(WaitForResult { port: parsed.port, ready: parsed.ready })
}

// ── port-forward (long-running, returns child process) ──

pub fn port_forward(name: &str, sandbox_port: u16, host_port: Option<u16>) -> Result<std::process::Child, String> {
    let mut cmd = heyvm_cmd();
    cmd.args(["port-forward", name, &sandbox_port.to_string()]);
    if let Some(hp) = host_port {
        cmd.args(["--host-port", &hp.to_string()]);
    }
    logging::info(&format!("[heyvm] port-forward: sandbox={}, port={}, host_port={:?}", name, sandbox_port, host_port));
    cmd.stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("port-forward: spawn failed: {}", e))
}

// ── snapshot ──

#[derive(serde::Serialize)]
pub struct SnapshotResult {
    pub image_name: String,
    pub image_path: String,
    pub size_bytes: u64,
}

pub fn snapshot(name: &str, snapshot_name: &str) -> Result<SnapshotResult, String> {
    let raw = run("snapshot", heyvm_cmd().args(["snapshot", "--format", "json", "--name", snapshot_name, name]))?;

    #[derive(serde::Deserialize)]
    struct JsonOut {
        image_name: String,
        image_path: String,
        size_bytes: u64,
    }

    let parsed: JsonOut = serde_json::from_str(raw.trim())
        .map_err(|e| format!("snapshot: failed to parse output: {} (raw: {})", e, raw.trim()))?;

    Ok(SnapshotResult {
        image_name: parsed.image_name,
        image_path: parsed.image_path,
        size_bytes: parsed.size_bytes,
    })
}
