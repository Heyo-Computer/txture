use crate::logging;
use serde::{Deserialize, Serialize};
use std::path::Path;

const REDIRECT_PORT: u16 = 19284;
const REDIRECT_URI: &str = "http://localhost:19284/callback";
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const CALENDAR_API: &str = "https://www.googleapis.com/calendar/v3";
const SCOPES: &str = "https://www.googleapis.com/auth/calendar.events.readonly";

// ── Config (persisted) ──

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CalendarConfig {
    pub client_id: String,
    pub client_secret: String,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub calendar_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CalendarTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

impl CalendarConfig {
    pub fn load(config_dir: &Path) -> Self {
        let path = config_dir.join("calendar.json");
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, config_dir: &Path) -> Result<(), String> {
        let path = config_dir.join("calendar.json");
        let content = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(path, content).map_err(|e| e.to_string())
    }
}

impl CalendarTokens {
    pub fn load(config_dir: &Path) -> Self {
        let path = config_dir.join("calendar_tokens.json");
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, config_dir: &Path) -> Result<(), String> {
        let path = config_dir.join("calendar_tokens.json");
        let content = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(path, content).map_err(|e| e.to_string())
    }

    pub fn is_valid(&self) -> bool {
        !self.access_token.is_empty()
            && chrono::Utc::now().timestamp() < self.expires_at - 60
    }

    pub fn has_refresh(&self) -> bool {
        !self.refresh_token.is_empty()
    }
}

// ── OAuth2 Flow ──

pub fn auth_url(client_id: &str) -> String {
    format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent",
        AUTH_URL,
        urlencoding(client_id),
        urlencoding(REDIRECT_URI),
        urlencoding(SCOPES),
    )
}

/// Start a localhost listener, wait for the OAuth callback, return the auth code.
pub async fn wait_for_auth_code() -> Result<String, String> {
    use tokio::net::TcpListener;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let listener = TcpListener::bind(format!("127.0.0.1:{}", REDIRECT_PORT))
        .await
        .map_err(|e| format!("Failed to bind redirect listener: {}", e))?;

    logging::info(&format!("calendar: listening for OAuth callback on port {}", REDIRECT_PORT));

    let (mut stream, _) = listener.accept()
        .await
        .map_err(|e| format!("Failed to accept connection: {}", e))?;

    let mut buf = vec![0u8; 4096];
    let n = stream.read(&mut buf)
        .await
        .map_err(|e| format!("Failed to read request: {}", e))?;
    let request = String::from_utf8_lossy(&buf[..n]);

    // Parse code from: GET /callback?code=xxx&scope=... HTTP/1.1
    let code = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|path| {
            path.split('?')
                .nth(1)?
                .split('&')
                .find_map(|param| {
                    let (k, v) = param.split_once('=')?;
                    if k == "code" { Some(v.to_string()) } else { None }
                })
        })
        .ok_or("No auth code in callback")?;

    let html = "<html><body><h2>Calendar connected!</h2><p>You can close this tab.</p></body></html>";
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        html.len(),
        html,
    );
    let _ = stream.write_all(response.as_bytes()).await;

    logging::info("calendar: received auth code");
    Ok(code)
}

/// Exchange auth code for tokens.
pub async fn exchange_code(
    client_id: &str,
    client_secret: &str,
    code: &str,
) -> Result<CalendarTokens, String> {
    #[derive(Deserialize)]
    struct TokenResponse {
        access_token: String,
        refresh_token: Option<String>,
        expires_in: i64,
    }

    let client = reqwest::Client::new();
    let resp = client
        .post(TOKEN_URL)
        .form(&[
            ("code", code),
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("redirect_uri", REDIRECT_URI),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token exchange failed: {}", e))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Token exchange error: {}", body));
    }

    let token: TokenResponse = resp.json().await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    Ok(CalendarTokens {
        access_token: token.access_token,
        refresh_token: token.refresh_token.unwrap_or_default(),
        expires_at: chrono::Utc::now().timestamp() + token.expires_in,
    })
}

/// Refresh an expired access token.
pub async fn refresh_access_token(
    client_id: &str,
    client_secret: &str,
    refresh_token: &str,
) -> Result<CalendarTokens, String> {
    #[derive(Deserialize)]
    struct TokenResponse {
        access_token: String,
        expires_in: i64,
    }

    let client = reqwest::Client::new();
    let resp = client
        .post(TOKEN_URL)
        .form(&[
            ("refresh_token", refresh_token),
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token refresh failed: {}", e))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Token refresh error: {}", body));
    }

    let token: TokenResponse = resp.json().await
        .map_err(|e| format!("Failed to parse refresh response: {}", e))?;

    Ok(CalendarTokens {
        access_token: token.access_token,
        refresh_token: refresh_token.to_string(),
        expires_at: chrono::Utc::now().timestamp() + token.expires_in,
    })
}

// ── Calendar API ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalendarEvent {
    pub summary: String,
    pub start_time: String,
    pub end_time: String,
}

pub async fn fetch_todays_events(
    access_token: &str,
    calendar_id: &str,
) -> Result<Vec<CalendarEvent>, String> {
    let cal_id = if calendar_id.is_empty() { "primary" } else { calendar_id };
    let today = chrono::Local::now().date_naive();
    let time_min = format!("{}T00:00:00Z", today);
    let time_max = format!("{}T23:59:59Z", today);

    let url = format!(
        "{}/calendars/{}/events?timeMin={}&timeMax={}&singleEvents=true&orderBy=startTime&maxResults=50",
        CALENDAR_API,
        urlencoding(cal_id),
        urlencoding(&time_min),
        urlencoding(&time_max),
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Calendar API request failed: {}", e))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Calendar API error: {}", body));
    }

    #[derive(Deserialize)]
    struct EventTime {
        #[serde(alias = "dateTime", alias = "date")]
        date_time: Option<String>,
    }

    #[derive(Deserialize)]
    struct GEvent {
        summary: Option<String>,
        start: Option<EventTime>,
        end: Option<EventTime>,
    }

    #[derive(Deserialize)]
    struct EventList {
        items: Option<Vec<GEvent>>,
    }

    let list: EventList = resp.json().await
        .map_err(|e| format!("Failed to parse calendar response: {}", e))?;

    let events = list.items.unwrap_or_default()
        .into_iter()
        .filter_map(|e| {
            Some(CalendarEvent {
                summary: e.summary?,
                start_time: e.start?.date_time.unwrap_or_default(),
                end_time: e.end?.date_time.unwrap_or_default(),
            })
        })
        .collect();

    Ok(events)
}

// ── Helpers ──

fn urlencoding(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                String::from(b as char)
            }
            _ => format!("%{:02X}", b),
        })
        .collect()
}
