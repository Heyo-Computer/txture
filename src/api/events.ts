import { listen } from "@tauri-apps/api/event";
import { agentStatus } from "../state/store";
import type { AgentStatus } from "../types";

export async function setupEventListeners() {
  await listen<string>("agent-status", (event) => {
    agentStatus.value = event.payload as AgentStatus;
  });
}
