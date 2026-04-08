import type { Artifact } from "../../types";

interface ArtifactItemProps {
  artifact: Artifact;
  onDelete: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const icons: Record<string, string> = {
    md: "\u{1F4DD}",
    txt: "\u{1F4C4}",
    json: "\u{1F4CB}",
    js: "\u{1F4DC}",
    ts: "\u{1F4DC}",
    py: "\u{1F40D}",
    rs: "\u{2699}",
    html: "\u{1F310}",
    css: "\u{1F3A8}",
    png: "\u{1F5BC}",
    jpg: "\u{1F5BC}",
    svg: "\u{1F5BC}",
  };
  return icons[ext] ?? "\u{1F4C1}";
}

export function ArtifactItem({ artifact, onDelete }: ArtifactItemProps) {
  return (
    <div class="artifact-item">
      <div class="artifact-icon">{getFileIcon(artifact.name)}</div>
      <div class="artifact-info">
        <div class="artifact-name">{artifact.name}</div>
        <div class="artifact-meta">{formatSize(artifact.size)}</div>
      </div>
      <button class="btn btn-sm btn-ghost" onClick={onDelete} title="Delete">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" /><path d="M14 11v6" />
        </svg>
      </button>
    </div>
  );
}
