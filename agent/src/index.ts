import express from "express";
import { Agent } from "./agent.js";
import { makeResponse, makeError } from "./types.js";
import type { AcpRequest } from "./types.js";

const app = express();
const PORT = Number(process.env.PORT ?? 8080);

app.use(express.json());

const agent = new Agent();

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ACP JSON-RPC endpoint
app.post("/rpc", async (req, res) => {
  const request = req.body as AcpRequest;

  if (!request.jsonrpc || request.jsonrpc !== "2.0" || !request.method) {
    res.status(400).json(makeError(request?.id ?? 0, -32600, "Invalid JSON-RPC request"));
    return;
  }

  try {
    switch (request.method) {
      case "agent/chat": {
        const message = (request.params as { message?: string })?.message;
        if (!message) {
          res.json(makeError(request.id, -32602, "Missing 'message' parameter"));
          return;
        }
        const response = await agent.chat(message);
        res.json(makeResponse(request.id, response));
        break;
      }

      case "agent/status": {
        res.json(makeResponse(request.id, { status: "running" }));
        break;
      }

      case "agent/clear": {
        agent.clearHistory();
        res.json(makeResponse(request.id, { cleared: true }));
        break;
      }

      case "agent/stop": {
        res.json(makeResponse(request.id, { stopping: true }));
        setTimeout(() => process.exit(0), 100);
        break;
      }

      default:
        res.json(makeError(request.id, -32601, `Method not found: ${request.method}`));
    }
  } catch (err: unknown) {
    const error = err as Error;
    res.json(makeError(request.id, -32603, error.message));
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Agent service listening on port ${PORT}`);
});
