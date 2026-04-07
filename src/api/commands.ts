import { invoke } from "@tauri-apps/api/core";
import type { DayEntry, TodoItem, AgentMessage, Artifact, Theme, AgentConfig, StatusInfo } from "../types";

// Storage commands
export async function loadDay(date: string): Promise<DayEntry> {
  return invoke("load_day", { date });
}

export async function getDaysRange(): Promise<DayEntry[]> {
  return invoke("get_days_range");
}

export async function saveTodo(date: string, title: string): Promise<DayEntry> {
  return invoke("save_todo", { date, title });
}

export async function updateTodo(date: string, todo: TodoItem): Promise<DayEntry> {
  return invoke("update_todo", { date, todo });
}

export async function deleteTodo(date: string, todoId: string): Promise<DayEntry> {
  return invoke("delete_todo", { date, todoId });
}

export async function loadSpec(date: string, todoId: string): Promise<string> {
  return invoke("load_spec", { date, todoId });
}

export async function saveSpec(date: string, todoId: string, content: string): Promise<void> {
  return invoke("save_spec", { date, todoId, content });
}

// Theme commands
export async function getTheme(): Promise<Theme> {
  return invoke("get_theme");
}

export async function setTheme(themeName: string): Promise<void> {
  return invoke("set_theme", { themeName });
}

// heyvm commands
export async function createVm(): Promise<string> {
  return invoke("create_vm");
}

export async function startVm(): Promise<boolean> {
  return invoke("start_vm");
}

export async function stopVm(): Promise<boolean> {
  return invoke("stop_vm");
}

export async function vmStatus(): Promise<string> {
  return invoke("vm_status");
}

// Agent commands
export async function setupAgent(): Promise<string> {
  return invoke("setup_agent");
}

export async function startAgent(): Promise<void> {
  return invoke("start_agent");
}

export async function stopAgent(): Promise<void> {
  return invoke("stop_agent");
}

export async function sendMessage(message: string): Promise<AgentMessage> {
  return invoke("send_message", { message });
}

export async function getAgentStatus(): Promise<string> {
  return invoke("agent_status");
}

export async function getChatHistory(date: string): Promise<AgentMessage[]> {
  return invoke("get_chat_history", { date });
}

// Artifact commands
export async function listArtifacts(): Promise<Artifact[]> {
  return invoke("list_artifacts");
}

export async function readArtifact(name: string): Promise<string> {
  return invoke("read_artifact", { name });
}

export async function deleteArtifact(name: string): Promise<void> {
  return invoke("delete_artifact", { name });
}

// Config commands
export async function getAgentConfig(): Promise<AgentConfig> {
  return invoke("get_agent_config");
}

export async function setAgentConfig(config: AgentConfig): Promise<void> {
  return invoke("set_agent_config", { config });
}

export async function getStatusInfo(): Promise<StatusInfo> {
  return invoke("get_status_info");
}

export async function getRecentLogs(lines?: number): Promise<string> {
  return invoke("get_recent_logs", { lines });
}
