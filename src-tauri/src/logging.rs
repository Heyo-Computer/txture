use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

static LOG_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

/// Initialize logging. Call once at startup with the data directory.
pub fn init(data_dir: &Path) {
    let log_dir = data_dir.join("logs");
    let _ = fs::create_dir_all(&log_dir);
    let path = log_dir.join("todo.log");
    *LOG_PATH.lock().unwrap() = Some(path);
}

/// Return the resolved log file path (if initialized).
pub fn log_path() -> Option<PathBuf> {
    LOG_PATH.lock().unwrap().clone()
}

fn write_entry(level: &str, msg: &str) {
    let path = match LOG_PATH.lock().unwrap().clone() {
        Some(p) => p,
        None => return,
    };

    let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let line = format!("[{}] [{}] {}\n", ts, level, msg);

    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = f.write_all(line.as_bytes());
    }
}

pub fn info(msg: &str) {
    write_entry("INFO", msg);
}

pub fn warn(msg: &str) {
    write_entry("WARN", msg);
}

pub fn error(msg: &str) {
    write_entry("ERROR", msg);
}

/// Log an info message and return the message (convenience for chaining).
pub fn step(msg: &str) -> &str {
    info(msg);
    msg
}
