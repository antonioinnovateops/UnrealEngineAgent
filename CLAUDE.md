# UnrealEngineAgent

A collection of Claude Code agents, skills, and an MCP server for Unreal Engine 5 development.

## Project Structure

```
.claude/
├── agents/
│   ├── ue5-dev-agent.md      # C++ and Blueprint development
│   ├── ue5-docker-agent.md   # Docker containerization and CI/CD
│   └── ue5-linux-agent.md    # Linux setup, Vulkan, IDE configuration
├── skills/
│   ├── ue5-project-setup/    # Scaffold new UE5 projects
│   ├── ue5-cpp-scaffold/     # Generate C++ class boilerplate
│   └── ue5-docker-build/     # Docker build and deploy configs
├── settings.json
mcp-server/                   # TypeScript MCP server
├── src/
│   ├── index.ts              # Server entry point (stdio transport)
│   ├── tools/
│   │   ├── documentation.ts  # API search, class hierarchy, doc URLs
│   │   ├── project.ts        # Project analysis, CLAUDE.md generation
│   │   ├── learning.ts       # Learning resources and paths
│   │   └── cpp.ts            # C++ class generation, macro reference
│   └── data/
│       ├── ue5-api-index.ts  # 40+ core UE5 classes indexed
│       └── learning-resources.ts  # Curated learning resources
docker-demo/                  # Docker containerization
├── Dockerfile                # Multi-stage build for MCP server
├── docker-compose.yml        # Docker compose config
└── test-mcp.sh              # Test suite
Plan.md                       # UE5 learning resources guide
```

## Build Commands

```bash
# Build MCP server
cd mcp-server && npm install && npm run build

# Build Docker image
docker build -t ue5-mcp-server -f docker-demo/Dockerfile .

# Run tests
bash docker-demo/test-mcp.sh
```

## MCP Server Tools

The MCP server provides 8 tools:
- `ue5_search_api` — Search UE5 class index by name, category, module
- `ue5_class_hierarchy` — Show inheritance chain for any UE5 class
- `ue5_list_categories` — List all API categories with counts
- `ue5_doc_url` — Get official Epic documentation URLs
- `ue5_analyze_project` — Analyze a UE5 project directory
- `ue5_generate_claude_md` — Generate CLAUDE.md template for UE5 projects
- `ue5_find_resources` — Search learning resources by topic/level/format
- `ue5_learning_path` — Get structured learning path for specific topics
- `ue5_generate_class` — Generate complete C++ header/source pairs
- `ue5_macro_reference` — Look up UPROPERTY/UFUNCTION/UCLASS macro syntax

## Adding to Claude Code

To use the MCP server with Claude Code, add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "ue5": {
      "command": "node",
      "args": ["/path/to/UnrealEngineAgent/mcp-server/dist/index.js"]
    }
  }
}
```
