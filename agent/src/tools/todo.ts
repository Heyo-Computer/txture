import * as fs from "node:fs";
import * as path from "node:path";

const DATA_ROOT = "/data";

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  has_spec: boolean;
  created_at: string;
  updated_at: string;
}

interface DayEntry {
  date: string;
  todos: TodoItem[];
}

function dayDir(date: string): string {
  const [y, m, d] = date.split("-");
  return path.join(DATA_ROOT, "storage", y, m, d);
}

function loadDay(date: string): DayEntry {
  const file = path.join(dayDir(date), "day.json");
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  }
  return { date, todos: [] };
}

function saveDay(entry: DayEntry): void {
  const dir = dayDir(entry.date);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "day.json"), JSON.stringify(entry, null, 2), "utf-8");
}

export function saveTodoSpec(date: string, todoId: string, content: string): string {
  const entry = loadDay(date);
  const todo = entry.todos.find((t) => t.id === todoId);
  if (!todo) {
    return `Error: todo ${todoId} not found on ${date}`;
  }

  // Write spec file
  const specsDir = path.join(dayDir(date), "specs");
  fs.mkdirSync(specsDir, { recursive: true });
  const specPath = path.join(specsDir, `${todoId}.md`);
  fs.writeFileSync(specPath, content, "utf-8");

  // Mark has_spec on the todo
  todo.has_spec = true;
  todo.updated_at = new Date().toISOString();
  saveDay(entry);

  return `Saved spec for "${todo.title}" (${content.length} bytes)`;
}

export function updateTodo(
  date: string,
  todoId: string,
  title?: string,
  completed?: boolean,
): string {
  const entry = loadDay(date);
  const todo = entry.todos.find((t) => t.id === todoId);
  if (!todo) {
    return `Error: todo ${todoId} not found on ${date}`;
  }

  if (title !== undefined) todo.title = title;
  if (completed !== undefined) todo.completed = completed;
  todo.updated_at = new Date().toISOString();
  saveDay(entry);

  return `Updated "${todo.title}" (completed=${todo.completed})`;
}

export function getTodosForDate(date?: string): string {
  const d = date || new Date().toISOString().slice(0, 10);
  const entry = loadDay(d);

  if (entry.todos.length === 0) {
    return `No todos for ${d}`;
  }

  return entry.todos
    .map((t) => {
      const status = t.completed ? "[x]" : "[ ]";
      const spec = t.has_spec ? " (has spec)" : "";
      return `${status} ${t.title}\n    id: ${t.id}${spec}`;
    })
    .join("\n");
}
