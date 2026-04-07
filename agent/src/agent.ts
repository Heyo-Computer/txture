import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile, listDirectory } from "./tools/file.js";
import { execCommand } from "./tools/shell.js";
import { saveTodoSpec, updateTodo, getTodosForDate } from "./tools/todo.js";
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
    const systemPrompt =
      `You are a helpful agent for a todo/task management app. Today is ${today}.\n` +
      "The user's data directory is mounted at /data. The storage structure is:\n" +
      "  /data/storage/YYYY/MM/DD/day.json   — day's todos\n" +
      "  /data/storage/YYYY/MM/DD/specs/{todo-id}.md — spec for a todo\n" +
      "  /data/artifacts/ — reusable files\n\n" +
      "When the user mentions a todo with @[title](id:UUID|date:YYYY-MM-DD), use the UUID and date directly.\n" +
      "When asked to create a spec, use the save_spec tool — don't write files manually.\n" +
      "When you need to look up todos, use the get_todos tool.\n" +
      "Be concise and action-oriented. Prefer using tools over asking the user for information you can look up.";

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
