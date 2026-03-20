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
export {};
//# sourceMappingURL=http.d.ts.map