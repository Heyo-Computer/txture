import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs";
import { readFile, writeFile, listDirectory } from "./tools/file.js";
import { execCommand } from "./tools/shell.js";
import { saveTodoSpec, updateTodo, getTodosForDate } from "./tools/todo.js";
import { saveArtifact, listArtifacts } from "./tools/artifact.js";
import { getCalendarEvents, getCalendarEventById } from "./tools/calendar.js";

const CONFIG_PATH = "/data/config/agent.json";

interface PromptConfig {
  spec_verbosity: "terse" | "normal" | "detailed";
  user_context: string;
}

function loadPromptConfig(): PromptConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const verbosity = ["terse", "normal", "detailed"].includes(parsed.spec_verbosity)
      ? parsed.spec_verbosity
      : "normal";
    return {
      spec_verbosity: verbosity,
      user_context: typeof parsed.user_context === "string" ? parsed.user_context : "",
    };
  } catch {
    return { spec_verbosity: "normal", user_context: "" };
  }
}

function verbosityInstruction(verbosity: PromptConfig["spec_verbosity"]): string {
  switch (verbosity) {
    case "terse":
      return "When writing specs, be brief and to the point. Use minimal headers and bullet points. Skip preamble and obvious context. Aim for the smallest spec that captures the essential information.";
    case "detailed":
      return "When writing specs, be thorough. Include relevant context, rationale, edge cases, and step-by-step detail where applicable. Err on the side of more information.";
    case "normal":
    default:
      return "When writing specs, use a balanced level of detail — clear and complete without being exhaustive.";
  }
}
import type { AgentMessage } from "./types.js";
import { randomUUID } from "node:crypto";

const tools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file. The host data directory is mounted at /data.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path under /data (e.g., /data/storage/2026/04/05/day.json)" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file under /data.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path under /data" },
        content: { type: "string", description: "File content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_directory",
    description: "List files and directories under /data.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Directory path under /data" },
      },
      required: ["path"],
    },
  },
  {
    name: "exec_command",
    description: "Execute a shell command in the sandbox environment.",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: "Shell command to execute" },
      },
      required: ["command"],
    },
  },
  {
    name: "save_spec",
    description:
      "Save a markdown spec for a todo item. This writes the spec file and sets has_spec=true on the todo. " +
      "The date is in YYYY-MM-DD format and the todo_id is the UUID of the todo item.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date of the todo (YYYY-MM-DD)" },
        todo_id: { type: "string", description: "UUID of the todo item" },
        content: { type: "string", description: "Markdown content for the spec" },
      },
      required: ["date", "todo_id", "content"],
    },
  },
  {
    name: "update_todo",
    description: "Update a todo item's title or completed status.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date of the todo (YYYY-MM-DD)" },
        todo_id: { type: "string", description: "UUID of the todo item" },
        title: { type: "string", description: "New title (optional, omit to keep current)" },
        completed: { type: "boolean", description: "New completed status (optional, omit to keep current)" },
      },
      required: ["date", "todo_id"],
    },
  },
  {
    name: "get_todos",
    description: "Get all todo items for a given date. Use this to look up todo IDs and see what the user is working on.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date to query (YYYY-MM-DD). Defaults to today." },
      },
      required: [],
    },
  },
  {
    name: "save_artifact",
    description:
      "Save a reusable file (script, snippet, reference, markdown note) to the artifacts library. " +
      "Updates the index so the file appears in the Artifacts tab. " +
      "Use this for standalone reusable files, NOT for todo-attached docs (use save_spec for those).",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Filename (e.g., 'hello.py', 'notes.md'). Just the name, no path." },
        content: { type: "string", description: "File content" },
      },
      required: ["name", "content"],
    },
  },
  {
    name: "list_artifacts",
    description: "List all saved artifacts with their names, sizes, and creation dates.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "calendar_events",
    description:
      "List upcoming Google Calendar events from the local cache. Returns events with id, summary, time, " +
      "location, meeting URL, and attendees. Use this to look up events the user is asking about. " +
      "Defaults to today + next 7 days.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Start date YYYY-MM-DD (defaults to today)" },
        days_ahead: { type: "number", description: "Number of days after start date to include (default 7)" },
      },
      required: [],
    },
  },
  {
    name: "calendar_event",
    description:
      "Fetch full details for a specific calendar event by id. Returns the full event JSON " +
      "(summary, attendees, description, location, meeting URL). Use this when you need complete details " +
      "to craft a spec — e.g., the full description, full attendee list, or meeting agenda.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_id: { type: "string", description: "Event id from calendar_events output" },
      },
      required: ["event_id"],
    },
  },
];

// Anthropic server-managed tool for web search
const serverTools: Anthropic.Messages.WebSearchTool20250305[] = [
  { type: "web_search_20250305", name: "web_search" },
];

type ConversationMessage = Anthropic.MessageParam;

export class Agent {
  private client: Anthropic;
  private history: ConversationMessage[] = [];
  private model: string;

  constructor() {
    this.client = new Anthropic();
    this.model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  }

  async chat(userMessage: string): Promise<AgentMessage> {
    this.history.push({ role: "user", content: userMessage });

    const today = new Date().toISOString().slice(0, 10);
    const promptConfig = loadPromptConfig();

    let systemPrompt =
      `You are a helpful agent for a todo/task management app. Today is ${today}.\n` +
      "The user's data directory is mounted at /data. The storage structure is:\n" +
      "  /data/storage/YYYY/MM/DD/day.json   — day's todos\n" +
      "  /data/storage/YYYY/MM/DD/specs/{todo-id}.md — spec for a todo\n" +
      "  /data/artifacts/ — reusable files\n\n" +
      "When the user mentions a todo with @[title](id:UUID|date:YYYY-MM-DD), use the UUID and date directly.\n" +
      "When asked to create a spec for a todo, use the save_spec tool — don't write files manually.\n" +
      "When asked to save anything to artifacts (a script, snippet, note, reference, or any file " +
      "the user wants to keep around), you MUST use the save_artifact tool — NOT write_file. " +
      "write_file is for low-level file operations only; save_artifact updates the artifact index " +
      "so the file appears in the user's Artifacts tab. " +
      "save_spec is for todo-attached docs; save_artifact is for standalone reusable files.\n" +
      "When you need to look up todos, use the get_todos tool.\n" +
      "When the user references a meeting or calendar event, use calendar_events to list upcoming events " +
      "and calendar_event to fetch full details (attendees, description, meeting link). " +
      "To create a spec for an event, look up the matching todo with get_todos, then call save_spec.\n" +
      "Be concise and action-oriented. Prefer using tools over asking the user for information you can look up.\n\n" +
      verbosityInstruction(promptConfig.spec_verbosity);

    if (promptConfig.user_context.trim()) {
      systemPrompt +=
        "\n\nThe user has provided this context about themselves — use it to tailor specs and responses:\n" +
        promptConfig.user_context.trim();
    }

    let response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      tools: [...tools, ...serverTools] as Anthropic.Tool[],
      messages: this.history,
    });

    // Handle tool use loop
    while (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await this.executeTool(block.name, block.input as Record<string, string>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      this.history.push({ role: "assistant", content: response.content });
      this.history.push({ role: "user", content: toolResults });

      response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        tools: [...tools, ...serverTools] as Anthropic.Tool[],
        messages: this.history,
      });
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    this.history.push({ role: "assistant", content: response.content });

    return {
      id: randomUUID(),
      role: "assistant",
      content: text,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeTool(name: string, input: Record<string, string>): Promise<string> {
    try {
      switch (name) {
        case "read_file":
          return readFile(input.path);
        case "write_file":
          return writeFile(input.path, input.content);
        case "list_directory":
          return listDirectory(input.path);
        case "exec_command":
          return execCommand(input.command);
        case "save_spec":
          return saveTodoSpec(input.date, input.todo_id, input.content);
        case "update_todo":
          return updateTodo(input.date, input.todo_id, input.title, input.completed as unknown as boolean | undefined);
        case "get_todos":
          return getTodosForDate(input.date);
        case "save_artifact":
          return saveArtifact(input.name, input.content);
        case "list_artifacts":
          return listArtifacts();
        case "calendar_events":
          return getCalendarEvents(input.date, input.days_ahead as unknown as number | undefined);
        case "calendar_event":
          return getCalendarEventById(input.event_id);
        default:
          return `Unknown tool: ${name}`;
      }
    } catch (err: unknown) {
      const error = err as Error;
      return `Tool error: ${error.message}`;
    }
  }

  clearHistory() {
    this.history = [];
  }
}
