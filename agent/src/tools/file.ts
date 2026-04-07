import * as fs from "node:fs";
import * as path from "node:path";

// The host ~/.todo dir is mounted at /data inside the VM
const DATA_ROOT = "/data";

function resolveSafe(filePath: string): string {
  const resolved = path.resolve(DATA_ROOT, filePath.replace(/^\/data\/?/, ""));
  if (!resolved.startsWith(DATA_ROOT)) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

export function readFile(filePath: string): string {
  return fs.readFileSync(resolveSafe(filePath), "utf-8");
}

export function writeFile(filePath: string, content: string): string {
  const resolved = resolveSafe(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content, "utf-8");
  return `Wrote ${content.length} bytes to ${filePath}`;
}

export function listDirectory(dirPath: string): string {
  const resolved = resolveSafe(dirPath);
  if (!fs.existsSync(resolved)) {
    return "Directory does not exist";
  }

  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  return entries
    .map((e) => `${e.isDirectory() ? "[dir]" : "[file]"} ${e.name}`)
    .join("\n");
}
