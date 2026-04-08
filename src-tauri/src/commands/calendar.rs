use tauri::{AppHandle, State, Manager, Emitter};
use crate::services::calendar as cal;
use crate::services::storage;
use crate::state::AppState;
use crate::logging;

#[tauri::command]
pub fn get_calendar_config(state: State<AppState>) -> cal::CalendarConfig {
    cal::CalendarConfig::load(&state.config_dir)
}

#[tauri::command]
pub fn set_calendar_config(config: cal::CalendarConfig, state: State<AppState>) -> Result<(), String> {
    config.save(&state.config_dir)
}

#[tauri::command]
pub fn get_calendar_status(state: State<AppState>) -> serde_json::Value {
    let config = cal::CalendarConfig::load(&state.config_dir);
    let tokens = cal::CalendarTokens::load(&state.config_dir);

    serde_json::json!({
        "configured": !config.client_id.is_empty(),
        "connected": tokens.has_refresh(),
        "token_valid": tokens.is_valid(),
        "enabled": config.enabled,
    })
}

/// Start the OAuth flow: opens the browser and waits for the callback.
#[tauri::command]
pub async fn connect_google_calendar(
    _app: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let config = cal::CalendarConfig::load(&state.config_dir);
    if config.client_id.is_empty() || config.client_secret.is_empty() {
        return Err("Set Google OAuth Client ID and Client Secret in settings first.".to_string());
    }

    let url = cal::auth_url(&config.client_id);
    logging::info(&format!("calendar: opening auth URL"));

    // Open browser
    let _ = tauri::async_runtime::spawn_blocking(move || {
        let _ = open::that(&url);
    }).await;

    // Wait for callback
    let code = cal::wait_for_auth_code().await?;

    // Exchange for tokens
    let tokens = cal::exchange_code(&config.client_id, &config.client_secret, &code).await?;
    tokens.save(&state.config_dir)?;

    logging::info("calendar: OAuth complete, tokens saved");
    Ok("Google Calendar connected.".to_string())
}

#[tauri::command]
pub async fn disconnect_google_calendar(state: State<'_, AppState>) -> Result<(), String> {
    let empty = cal::CalendarTokens::default();
    empty.save(&state.config_dir)?;
    logging::info("calendar: disconnected");
    Ok(())
}

/// Fetch today's events and return them (without syncing to todos).
#[tauri::command]
pub async fn fetch_calendar_events(
    state: State<'_, AppState>,
) -> Result<Vec<cal::CalendarEvent>, String> {
    let tokens = ensure_valid_token(&state).await?;
    let config = cal::CalendarConfig::load(&state.config_dir);
    cal::fetch_todays_events(&tokens.access_token, &config.calendar_id).await
}

/// Sync today's calendar events into the todo list.
#[tauri::command]
pub async fn sync_calendar_to_todos(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let config = cal::CalendarConfig::load(&state.config_dir);
    if !config.enabled || config.client_id.is_empty() {
        return Ok("Calendar sync not enabled.".to_string());
    }

    let tokens = match ensure_valid_token(&state).await {
        Ok(t) => t,
        Err(e) => {
            logging::warn(&format!("calendar sync: token error: {}", e));
            return Err(e);
        }
    };

    let events = cal::fetch_todays_events(&tokens.access_token, &config.calendar_id).await?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let day = storage::load_day(&state.storage_root, &today);
    let existing_titles: Vec<String> = day.todos.iter().map(|t| t.title.clone()).collect();

    let mut added = 0;
    for event in &events {
        let title = format_event_title(event);
        if !existing_titles.contains(&title) {
            storage::add_todo(&state.storage_root, &today, &title)
                .map_err(|e| format!("Failed to add todo: {}", e))?;
            added += 1;
        }
    }

    let msg = format!("Synced {} events, added {} new todos.", events.len(), added);
    logging::info(&format!("calendar: {}", msg));
    Ok(msg)
}

/// Called from startup hook — sync silently if configured.
pub async fn auto_sync_calendar(app: AppHandle) {
    let state = app.state::<AppState>();
    let config = cal::CalendarConfig::load(&state.config_dir);
    if !config.enabled || config.client_id.is_empty() {
        return;
    }

    let tokens = cal::CalendarTokens::load(&state.config_dir);
    if !tokens.has_refresh() {
        logging::info("calendar auto-sync: no refresh token, skipping");
        return;
    }

    logging::info("calendar auto-sync: starting");

    // Ensure valid token
    let access_token = if tokens.is_valid() {
        tokens.access_token.clone()
    } else {
        match cal::refresh_access_token(&config.client_id, &config.client_secret, &tokens.refresh_token).await {
            Ok(new_tokens) => {
                let token = new_tokens.access_token.clone();
                let _ = new_tokens.save(&state.config_dir);
                token
            }
            Err(e) => {
                logging::warn(&format!("calendar auto-sync: refresh failed: {}", e));
                return;
            }
        }
    };

    match cal::fetch_todays_events(&access_token, &config.calendar_id).await {
        Ok(events) => {
            let today = chrono::Local::now().format("%Y-%m-%d").to_string();
            let day = storage::load_day(&state.storage_root, &today);
            let existing_titles: Vec<String> = day.todos.iter().map(|t| t.title.clone()).collect();

            let mut added = 0;
            for event in &events {
                let title = format_event_title(event);
                if !existing_titles.contains(&title) {
                    let _ = storage::add_todo(&state.storage_root, &today, &title);
                    added += 1;
                }
            }
            if added > 0 {
                logging::info(&format!("calendar auto-sync: added {} events as todos", added));
                let _ = app.emit("calendar-synced", added);
            } else {
                logging::info("calendar auto-sync: no new events");
            }
        }
        Err(e) => {
            logging::warn(&format!("calendar auto-sync: fetch failed: {}", e));
        }
    }
}

// ── Helpers ──

async fn ensure_valid_token(state: &AppState) -> Result<cal::CalendarTokens, String> {
    let config = cal::CalendarConfig::load(&state.config_dir);
    let tokens = cal::CalendarTokens::load(&state.config_dir);

    if tokens.is_valid() {
        return Ok(tokens);
    }

    if !tokens.has_refresh() {
        return Err("Not connected to Google Calendar. Connect in Settings.".to_string());
    }

    let new_tokens = cal::refresh_access_token(
        &config.client_id,
        &config.client_secret,
        &tokens.refresh_token,
    ).await?;

    new_tokens.save(&state.config_dir)?;
    Ok(new_tokens)
}

fn format_event_title(event: &cal::CalendarEvent) -> String {
    if event.start_time.is_empty() {
        // All-day event
        event.summary.clone()
    } else if let Some(time) = event.start_time.split('T').nth(1) {
        // Timed event — show HH:MM
        let short = &time[..5.min(time.len())];
        format!("{} - {}", short, event.summary)
    } else {
        event.summary.clone()
    }
}
