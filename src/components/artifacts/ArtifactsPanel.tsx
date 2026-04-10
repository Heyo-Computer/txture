import { useEffect, useState } from "preact/hooks";
import { artifacts } from "../../state/store";
import { listArtifacts, deleteArtifact, readArtifact } from "../../api/commands";
import { ArtifactItem } from "./ArtifactItem";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import type { Artifact } from "../../types";

export function ArtifactsPanel() {
  const [viewing, setViewing] = useState<Artifact | null>(null);
  const [content, setContent] = useState<string>("");
  const [loadError, setLoadError] = useState<string>("");

  useEffect(() => {
    listArtifacts()
      .then((items) => {
        artifacts.value = items;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!viewing) {
      setContent("");
      setLoadError("");
      return;
    }
    readArtifact(viewing.name)
      .then((c) => { setContent(c); setLoadError(""); })
      .catch((e) => { setContent(""); setLoadError(`${e}`); });
  }, [viewing]);

  useEffect(() => {
    if (!viewing) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewing(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewing]);

  async function handleDelete(name: string) {
    await deleteArtifact(name);
    artifacts.value = artifacts.value.filter((a) => a.name !== name);
    if (viewing?.name === name) setViewing(null);
  }

  const isMarkdown = viewing?.name.toLowerCase().endsWith(".md") ?? false;

  return (
    <>
      {artifacts.value.length === 0 ? (
        <div class="empty-state" style={{ paddingTop: "60px" }}>
          <div class="empty-state-text">
            No artifacts yet. The agent can save files here for reuse.
          </div>
        </div>
      ) : (
        <div class="artifacts-panel">
          {artifacts.value.map((artifact) => (
            <ArtifactItem
              key={artifact.name}
              artifact={artifact}
              onDelete={() => handleDelete(artifact.name)}
              onView={() => setViewing(artifact)}
            />
          ))}
        </div>
      )}

      {viewing && (
        <div class="artifact-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewing(null); }}>
          <div class="artifact-modal">
            <div class="artifact-modal-header">
              <span class="artifact-modal-title">{viewing.name}</span>
              <button class="settings-close" onClick={() => setViewing(null)} title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            <div class="artifact-modal-body">
              {loadError ? (
                <div class="status-error">{loadError}</div>
              ) : isMarkdown ? (
                <MarkdownRenderer content={content} />
              ) : (
                <pre class="artifact-plain">{content}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
