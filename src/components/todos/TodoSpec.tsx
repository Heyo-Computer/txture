import { useState, useEffect } from "preact/hooks";
import { loadSpec, saveSpec } from "../../api/commands";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import { useReadAloud } from "../../hooks/useReadAloud";
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
  const [modalOpen, setModalOpen] = useState(false);
  const { speaking, toggle: toggleSpeak, stop: stopSpeak } = useReadAloud();

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

  // Stop speech when unmounting or switching to edit
  useEffect(() => () => stopSpeak(), []);

  return (
    <>
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
              <div class="todo-spec-content-row">
                <div
                  class="todo-spec-content"
                  onClick={() => setEditing(true)}
                  style={{ cursor: "pointer", flex: 1 }}
                >
                  <MarkdownRenderer content={content} />
                </div>
                <button
                  class={`btn btn-sm btn-ghost spec-action-btn${speaking ? " speaking" : ""}`}
                  onClick={() => toggleSpeak(content)}
                  title={speaking ? "Stop reading" : "Read aloud"}
                >
                  {speaking ? "\u25A0" : "\u25B6"}
                </button>
                <button
                  class="btn btn-sm btn-ghost spec-action-btn"
                  onClick={() => setModalOpen(true)}
                  title="Expand spec"
                >
                  &#x2922;
                </button>
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

      {modalOpen && (
        <SpecModal
          title={todo.title}
          content={content}
          onClose={() => setModalOpen(false)}
          onEdit={() => {
            setModalOpen(false);
            setEditing(true);
          }}
        />
      )}
    </>
  );
}

function SpecModal({
  title,
  content,
  onClose,
  onEdit,
}: {
  title: string;
  content: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { speaking, toggle: toggleSpeak, stop: stopSpeak } = useReadAloud();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Stop speech on unmount
  useEffect(() => () => stopSpeak(), []);

  return (
    <div class="spec-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="spec-modal">
        <div class="spec-modal-header">
          <span class="spec-modal-title">{title}</span>
          <div class="spec-modal-header-actions">
            <button
              class={`btn btn-sm btn-ghost${speaking ? " speaking" : ""}`}
              onClick={() => toggleSpeak(content)}
              title={speaking ? "Stop reading" : "Read aloud"}
            >
              {speaking ? "\u25A0 Stop" : "\u25B6 Read"}
            </button>
            <button class="btn btn-sm btn-ghost" onClick={onEdit}>
              Edit
            </button>
            <button class="btn btn-sm btn-ghost" onClick={onClose} title="Close">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
        <div class="spec-modal-body">
          <MarkdownRenderer content={content} />
        </div>
      </div>
    </div>
  );
}
