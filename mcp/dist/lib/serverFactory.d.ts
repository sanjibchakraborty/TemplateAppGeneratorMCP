import { Server } from "@modelcontextprotocol/sdk/server/index.js";
/**
 * Creates and fully configures the MCP server with all tools registered.
 * Returned server is transport-agnostic — connect it to stdio or HTTP.
 *
 * Tools exposed:
 *   ios_project_wizard   — primary entry point; drives the full creation wizard
 *   list_ios_modules     — helper to list available modules (used internally by wizard step 3)
 */
export declare function createMcpServer(): Server;
//# sourceMappingURL=serverFactory.d.ts.map