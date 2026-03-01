import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerDocTools } from "./tools/documentation.js";
import { registerProjectTools } from "./tools/project.js";
import { registerLearningTools } from "./tools/learning.js";
import { registerCppTools } from "./tools/cpp.js";
import { registerRemoteControlTools } from "./tools/remote-control.js";
import { registerEditorControlTools } from "./tools/editor-control.js";

const server = new McpServer({
  name: "ue5-mcp-server",
  version: "1.1.0",
});

// Register all tool groups
registerDocTools(server);
registerProjectTools(server);
registerLearningTools(server);
registerCppTools(server);
registerRemoteControlTools(server);
registerEditorControlTools(server);

// Start server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("UE5 MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start UE5 MCP Server:", error);
  process.exit(1);
});
