import { execSync } from "node:child_process";

const TIMEOUT_MS = 30_000;
const MAX_OUTPUT = 10_000;

export function execCommand(command: string): string {
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      cwd: "/storage",
    });
    if (output.length > MAX_OUTPUT) {
      return output.slice(0, MAX_OUTPUT) + "\n... (output truncated)";
    }
    return output;
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    return `Error: ${error.stderr || error.message || "Command failed"}`;
  }
}
