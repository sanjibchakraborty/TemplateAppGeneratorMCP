#!/usr/bin/env node

/**
 * HTTP transport entry point — supports both protocols Cursor may use:
 *
 *  1. Legacy SSE  (what Cursor actually uses via the "url" config):
 *       GET  /mcp      → opens SSE stream, server sends endpoint event
 *       POST /messages → client sends JSON-RPC messages here
 *
 *  2. Streamable HTTP  (modern spec, tried first by newer clients):
 *       POST /mcp      → initialize + subsequent messages
 *       GET  /mcp + mcp-session-id header → SSE notifications
 *
 * Usage:
 *   node dist/http.js              # port 3846 (default)
 *   PORT=4000 node dist/http.js    # custom port
 */

import express from "express";
import { randomUUID } from "crypto";
import { IncomingMessage, ServerResponse } from "http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "./lib/serverFactory.js";
import { ensureGeneratorRoot } from "./lib/generatorRoot.js";

const HOST = "127.0.0.1";
const PORT = parseInt(process.env.PORT ?? "3846", 10);

const app = express();
app.use(express.json());

// ─── Legacy SSE sessions (protocol 1) ────────────────────────────────────────
// sessionId → SSEServerTransport  (used for routing POST /messages)
const sseSessions = new Map<string, SSEServerTransport>();

// ─── StreamableHTTP sessions (protocol 2) ────────────────────────────────────
const httpSessions = new Map<string, StreamableHTTPServerTransport>();

// ── GET /mcp ──────────────────────────────────────────────────────────────────
// Cursor connects here first. If there's no mcp-session-id it's the legacy SSE
// handshake — open a new SSE stream and tell the client where to POST.
// If mcp-session-id is present it's a StreamableHTTP SSE-notification request.
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  // ── StreamableHTTP: existing session wants SSE notifications ────────────
  if (sessionId && httpSessions.has(sessionId)) {
    const transport = httpSessions.get(sessionId)!;
    await transport.handleRequest(
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse
    );
    return;
  }

  // ── Legacy SSE: open a new stream ───────────────────────────────────────
  const transport = new SSEServerTransport("/messages", res as unknown as ServerResponse);
  sseSessions.set(transport.sessionId, transport);

  transport.onclose = () => sseSessions.delete(transport.sessionId);
  transport.onerror = (err) => {
    process.stderr.write(`SSE error [${transport.sessionId}]: ${err.message}\n`);
    sseSessions.delete(transport.sessionId);
  };

  const server = createMcpServer();
  await server.connect(transport);
  // transport.start() is called internally by connect(); keep the response open.
});

// ── POST /messages  (legacy SSE protocol — client sends JSON-RPC here) ───────
app.post("/messages", async (req, res) => {
  const sessionId = req.query["sessionId"] as string | undefined;

  if (!sessionId || !sseSessions.has(sessionId)) {
    res.status(400).json({ error: "Unknown sessionId" });
    return;
  }

  const transport = sseSessions.get(sessionId)!;
  await transport.handlePostMessage(
    req as unknown as IncomingMessage,
    res as unknown as ServerResponse,
    req.body
  );
});

// ── POST /mcp  (StreamableHTTP protocol — initialize or subsequent messages) ─
app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && httpSessions.has(sessionId)) {
    const transport = httpSessions.get(sessionId)!;
    await transport.handleRequest(
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse,
      req.body
    );
    return;
  }

  if (!isInitializeRequest(req.body)) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "No active session. Send initialize first." },
      id: null,
    });
    return;
  }

  const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id: string): void => { httpSessions.set(id, transport); },
  });

  transport.onclose = () => {
    if (transport.sessionId) httpSessions.delete(transport.sessionId);
  };

  const server = createMcpServer();
  await server.connect(transport);
  await transport.handleRequest(
    req as unknown as IncomingMessage,
    res as unknown as ServerResponse,
    req.body
  );
});

// ── DELETE /mcp  (StreamableHTTP session teardown) ───────────────────────────
app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !httpSessions.has(sessionId)) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const transport = httpSessions.get(sessionId)!;
  await transport.close();
  httpSessions.delete(sessionId);
  res.status(204).send();
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    server: "ios-app-generator",
    sseSessions: sseSessions.size,
    httpSessions: httpSessions.size,
  });
});

// ── Start ──────────────────────────────────────────────────────────────────────
ensureGeneratorRoot()
  .then(() => {
    app.listen(PORT, HOST, () => {
      process.stderr.write(
        `iOS App Generator MCP running at http://${HOST}:${PORT}/mcp\n`
      );
    });
  })
  .catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Failed to resolve generator repo: ${msg}\n`);
    process.exit(1);
  });
