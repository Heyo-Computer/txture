export interface AcpRequest {
  jsonrpc: "2.0";
  method: string;
  params: Record<string, unknown>;
  id: number | string;
}

export interface AcpResponse {
  jsonrpc: "2.0";
  result?: unknown;
  error?: AcpError;
  id: number | string;
}

export interface AcpError {
  code: number;
  message: string;
  data?: unknown;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function makeResponse(id: number | string, result: unknown): AcpResponse {
  return { jsonrpc: "2.0", result, id };
}

export function makeError(id: number | string, code: number, message: string): AcpResponse {
  return { jsonrpc: "2.0", error: { code, message }, id };
}
