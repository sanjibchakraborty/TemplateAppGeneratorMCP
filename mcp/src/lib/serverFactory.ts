import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { listModulesTool, handleListModules } from "../tools/listModules.js";
import { wizardTool, handleWizard, type WizardInput } from "../tools/wizard.js";

/**
 * Creates and fully configures the MCP server with all tools registered.
 * Returned server is transport-agnostic — connect it to stdio or HTTP.
 *
 * Tools exposed:
 *   ios_project_wizard   — primary entry point; drives the full creation wizard
 *   list_ios_modules     — helper to list available modules (used internally by wizard step 3)
 */
export function createMcpServer(): Server {
  const server = new Server(
    { name: "ios-app-generator", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [wizardTool, listModulesTool],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "ios_project_wizard": {
        const input = (args ?? {}) as unknown as WizardInput;
        const content = await handleWizard(input);
        return { content: [{ type: "text", text: content }] };
      }

      case "list_ios_modules": {
        const content = handleListModules();
        return { content: [{ type: "text", text: content }] };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: "${name}". Available tools: ios_project_wizard, list_ios_modules`,
            },
          ],
          isError: true,
        };
    }
  });

  return server;
}
