import { signal } from "@preact/signals";
import type { DayEntry, TodoItem, AgentMessage, Artifact, ViewTab, AgentStatus } from "../types";

// Navigation — "days" and "artifacts" are tabs above the chat
export const activeTab = signal<ViewTab>("days");

// Accordion — which day is expanded (date string or null)
export const expandedDate = signal<string>(todayString());

// Days & Todos
export const days = signal<DayEntry[]>([]);
export const expandedTodoId = signal<string | null>(null);

export function dayByDate(date: string): DayEntry | undefined {
  return days.value.find((d) => d.date === date);
}

// Chat
export const chatMessages = signal<AgentMessage[]>([]);
export const isAgentLoading = signal<boolean>(false);

// Agent
export const agentStatus = signal<AgentStatus>("disconnected");

// Artifacts
export const artifacts = signal<Artifact[]>([]);

// Theme
export const currentThemeName = signal<string>("dark");

// Settings panel
export const settingsOpen = signal<boolean>(false);

// Agent name (mirrors vm_name from config, shown as app title)
export const agentName = signal<string>("ToDo");

// Status popover
export const statusPopoverOpen = signal<boolean>(false);

// Helpers
export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getDateRange(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return dates;
}

export function formatDate(dateStr: string): { display: string; weekday: string; isToday: boolean } {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return {
    display: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weekday: isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "long" }),
    isToday,
  };
}

// Actions — update days signal when todos change
export function updateDayTodos(date: string, todos: TodoItem[]) {
  const current = days.value;
  const idx = current.findIndex((d) => d.date === date);
  if (idx >= 0) {
    const updated = [...current];
    updated[idx] = { ...updated[idx], todos };
    days.value = updated;
  } else {
    days.value = [...current, { date, todos }];
  }
}
