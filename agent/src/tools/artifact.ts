import * as fs from "node:fs";
import * as path from "node:path";

const ARTIFACTS_DIR = "/data/artifacts";
const INDEX_FILE = path.join(ARTIFACTS_DIR, ".index.json");

interface Artifact {
  name: string;
  path: string;
  size: number;
  created_at: string;
}

interface ArtifactIndex {
  artifacts: Artifact[];
}

function loadIndex(): ArtifactIndex {
  if (!fs.existsSync(INDEX_FILE)) {
    return { artifacts: [] };
  }
  try {
    const raw = fs.readFileSync(INDEX_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.artifacts)) {
      return { artifacts: [] };
    }
    return parsed as ArtifactIndex;
  } catch {
    return { artifacts: [] };
  }
}

function saveIndex(index: ArtifactIndex): void {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), "utf-8");
}

export function saveArtifact(name: string, content: string): string {
  if (!name || name.includes("/") || name.includes("..")) {
    return `Error: invalid artifact name '${name}'. Use a plain filename like 'script.sh' or 'notes.md'.`;
  }

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const filePath = path.join(ARTIFACTS_DIR, name);
  fs.writeFileSync(filePath, content, "utf-8");

  const stat = fs.statSync(filePath);
  const artifact: Artifact = {
    name,
    path: filePath,
    size: stat.size,
    created_at: new Date().toISOString(),
  };

  const index = loadIndex();
  index.artifacts = index.artifacts.filter((a) => a.name !== name);
  index.artifacts.push(artifact);
  saveIndex(index);

  return `Saved artifact '${name}' (${stat.size} bytes)`;
}

export function listArtifacts(): string {
  const index = loadIndex();
  if (index.artifacts.length === 0) {
    return "No artifacts saved yet.";
  }
  return index.artifacts
    .map((a) => `${a.name} (${a.size} bytes, ${a.created_at})`)
    .join("\n");
}
