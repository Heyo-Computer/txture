import { useState, useEffect } from "preact/hooks";
import { loadSpec, saveSpec } from "../../api/commands";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import type { TodoItem } from "../../types";

interface TodoSpecProps {
  todo: TodoItem;
  date: string;
  onUpdate: (todo: TodoItem) => void;
}

export function TodoSpec({ todo, date, onUpdate }: TodoSpecProps) {
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    loadSpec(date, todo.id).then((spec) => {
      setContent(spec);
      setDraft(spec);
    }).catch(() => {});
  }, [date, todo.id]);

  async function handleSave() {
    await saveSpec(date, todo.id, draft);
    setContent(draft);
    setEditing(false);

    if (!todo.has_spec && draft.length > 0) {
      onUpdate({ ...todo, has_spec: true });
    } else if (todo.has_spec && draft.length === 0) {
      onUpdate({ ...todo, has_spec: false });
    }
  }

  function handleCancel() {
    setDraft(content);
    setEditing(false);
  }

  return (
    <div class="todo-spec">
      {editing ? (
        <>
          <textarea
            class="todo-spec-editor"
            value={draft}
            onInput={(e) => setDraft(e.currentTarget.value)}
            placeholder="Write a markdown spec..."
            rows={8}
          />
          <div class="todo-spec-actions">
            <button class="btn btn-sm btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button class="btn btn-sm btn-primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </>
      ) : (
        <>
          {content ? (
            <div
              class="todo-spec-content"
              onClick={() => setEditing(true)}
              style={{ cursor: "pointer" }}
            >
              <MarkdownRenderer content={content} />
            </div>
          ) : (
            <button
              class="btn btn-sm btn-ghost"
              onClick={() => setEditing(true)}
            >
              + Add spec
            </button>
          )}
        </>
      )}
    </div>
  );
}
