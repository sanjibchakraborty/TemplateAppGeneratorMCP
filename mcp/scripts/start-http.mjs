#!/usr/bin/env node
/**
 * Runs the HTTP MCP entrypoint after applying `env` from Cursor's mcp.json.
 * Cursor does not inject `env` into URL-based servers; this script reads the same
 * config file so you can keep a single `url` + `env` block and run: npm run start:http
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");

const DEFAULT_SERVER_KEY = "ios-app-generator";

function candidateMcpPaths() {
  const list = [];
  if (process.env.CURSOR_MCP_JSON?.trim()) {
    list.push(resolve(process.env.CURSOR_MCP_JSON.trim()));
  }
  list.push(join(packageRoot, ".cursor", "mcp.json"));
  list.push(join(packageRoot, "..", ".cursor", "mcp.json"));
  list.push(join(homedir(), ".cursor", "mcp.json"));
  return [...new Set(list)];
}

function applyEnvObject(env) {
  if (!env || typeof env !== "object") return;
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] !== undefined) continue;
    if (v === undefined || v === null) continue;
    process.env[k] = typeof v === "string" ? v : String(v);
  }
}

function loadEnvFromCursorMcp() {
  const serverKey = (
    process.env.MCP_SERVER_KEY?.trim() || DEFAULT_SERVER_KEY
  ).trim();

  for (const filePath of candidateMcpPaths()) {
    if (!existsSync(filePath)) continue;
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      continue;
    }
    const server = parsed?.mcpServers?.[serverKey];
    if (!server) continue;
    applyEnvObject(server.env);
    return filePath;
  }
  return null;
}

loadEnvFromCursorMcp();

const entryPath = resolve(packageRoot, "dist", "http.js");
const result = spawnSync(process.execPath, [entryPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
  cwd: packageRoot,
});

process.exit(result.status ?? 1);
