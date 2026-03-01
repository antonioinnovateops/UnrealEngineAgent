import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface McpArchitecture {
  name: string;
  type: string;
  protocol: string;
  port: number;
  language: string;
  toolCount: number;
  bestFor: string;
  repo: string;
  dockerImage?: string;
  strengths: string[];
  setup: string;
}

const MCP_ARCHITECTURES: McpArchitecture[] = [
  {
    name: "Official MCP Server (Remote Control API)",
    type: "remote-control",
    protocol: "HTTP/WebSocket",
    port: 6766,
    language: "TypeScript",
    toolCount: 24,
    bestFor: "Non-intrusive editor automation, multi-client scenarios",
    repo: "hub.docker.com/r/mcp/unreal-engine-mcp-server",
    dockerImage: "mcp/unreal-engine-mcp-server:latest",
    strengths: [
      "Uses UE5 built-in Remote Control Plugin — no engine modification",
      "HTTP REST API for stateless operations",
      "WebSocket for real-time subscriptions and events",
      "Works with packaged games (not just editor)",
      "Official Docker image available",
    ],
    setup: `1. Enable Remote Control Plugin in UE5 Editor (Edit → Plugins → Remote Control API)
2. Configure DefaultEngine.ini:
   [/Script/RemoteControlAPI.RemoteControlSettings]
   bAutoStartRemoteControl=True
   RemoteControlHttpServerPort=6766
   RemoteControlWebSocketServerPort=6767
3. Run: docker pull mcp/unreal-engine-mcp-server:latest
4. Connect: docker run -it --rm -e UE_HOST=host.docker.internal -e UE_RC_HTTP_PORT=6766 mcp/unreal-engine-mcp-server:latest`,
  },
  {
    name: "ChiR24 Unreal MCP (Automation Bridge)",
    type: "automation-bridge",
    protocol: "TCP",
    port: 8091,
    language: "TypeScript + C++",
    toolCount: 36,
    bestFor: "High-performance structured workflows, deep engine access",
    repo: "github.com/ChiR24/Unreal_mcp",
    strengths: [
      "Native C++ plugin for maximum performance (TCP sockets)",
      "36 tools with action-based dispatch",
      "Optional GraphQL API for complex queries",
      "Geometry Script integration for procedural meshes",
      "Full asset browser and import system",
    ],
    setup: `1. Clone: git clone https://github.com/ChiR24/Unreal_mcp.git
2. Copy plugins/McpAutomationBridge to your project's Plugins/ directory
3. Open project in UE5 — click "Yes" when prompted to rebuild
4. Restart editor (plugin loads on next launch)
5. Build MCP server: docker build -t unreal-mcp:latest .
6. Run: docker run -it --rm -e MCP_AUTOMATION_HOST=127.0.0.1 -e MCP_AUTOMATION_PORT=8091 unreal-mcp:latest`,
  },
  {
    name: "Flopperam Unreal MCP (Advanced World Building)",
    type: "world-building",
    protocol: "TCP",
    port: 6776,
    language: "Python",
    toolCount: 20,
    bestFor: "Generative AI-driven world design, rapid prototyping",
    repo: "github.com/flopperam/unreal-engine-mcp",
    strengths: [
      "Generate entire towns, castles, structures from natural language",
      "Full Blueprint creation and modification",
      "Physics simulation with complex constraints",
      "'Flop Agent' — autonomous AI agent running inside UE5",
      "Starter project included (UE 5.5+)",
    ],
    setup: `1. Clone: git clone https://github.com/flopperam/unreal-engine-mcp.git
2. Option A — Use included starter project: cd MCPGameProject
3. Option B — Copy UnrealMCP plugin to your project's Plugins/
4. Run server: cd Python && python3 -m uv run unreal_mcp_server_advanced.py
5. Or via Docker: docker run -it --rm -e UE_PROJECT_PATH=/project/MyGame.uproject python:3.11-slim`,
  },
];

interface McpTool {
  name: string;
  category: string;
  description: string;
  server: string;
}

const MCP_TOOLS: McpTool[] = [
  // Actor Management
  { name: "spawn_actor", category: "Actors", description: "Spawn an actor in the level by class or blueprint path", server: "all" },
  { name: "set_actor_transform", category: "Actors", description: "Set position, rotation, and scale of an actor", server: "all" },
  { name: "list_actors_in_level", category: "Actors", description: "List all actors in the current level with filtering", server: "all" },
  // Materials
  { name: "create_material", category: "Materials", description: "Create a new material asset with node graph", server: "all" },
  { name: "edit_material_instance", category: "Materials", description: "Modify material instance parameters (scalar, vector, texture)", server: "all" },
  { name: "set_material_parameter", category: "Materials", description: "Set a specific parameter on a material instance", server: "all" },
  // Blueprints
  { name: "create_blueprint", category: "Blueprints", description: "Create a new Blueprint class from a parent", server: "all" },
  { name: "add_component", category: "Blueprints", description: "Add a component to a Blueprint actor", server: "all" },
  { name: "compile_blueprint", category: "Blueprints", description: "Compile a Blueprint and report errors", server: "all" },
  // Gameplay
  { name: "create_gamemode", category: "Gameplay", description: "Create a GameMode with rules and player setup", server: "all" },
  { name: "create_game_state", category: "Gameplay", description: "Create a GameState for tracking match/session data", server: "all" },
  { name: "setup_player_controller", category: "Gameplay", description: "Configure a PlayerController with input and HUD", server: "all" },
  // Level
  { name: "load_level", category: "Level", description: "Load a level by path or name", server: "all" },
  { name: "create_level", category: "Level", description: "Create a new empty level", server: "all" },
  { name: "manage_streaming", category: "Level", description: "Configure level streaming volumes and settings", server: "all" },
  // VFX
  { name: "create_niagara_system", category: "VFX", description: "Create a Niagara particle system", server: "all" },
  { name: "spawn_emitter", category: "VFX", description: "Spawn a particle emitter at a location", server: "all" },
  { name: "control_particle_effects", category: "VFX", description: "Start, stop, or modify active particle effects", server: "all" },
  // Animation
  { name: "create_animation_blueprint", category: "Animation", description: "Create an Animation Blueprint with state machine", server: "all" },
  { name: "add_montage", category: "Animation", description: "Add an animation montage to a character", server: "all" },
  { name: "set_skeleton", category: "Animation", description: "Assign a skeleton asset to a mesh", server: "all" },
  // AI
  { name: "create_ai_controller", category: "AI", description: "Create an AI Controller with perception and behavior", server: "all" },
  { name: "configure_behavior_tree", category: "AI", description: "Create or modify a Behavior Tree asset", server: "all" },
  { name: "setup_perception", category: "AI", description: "Configure AI Perception with sight, hearing, damage senses", server: "all" },
  // Assets
  { name: "create_asset", category: "Assets", description: "Create a new asset of any type", server: "all" },
  { name: "import_asset", category: "Assets", description: "Import external files (FBX, PNG, WAV) as UE assets", server: "all" },
  { name: "delete_asset", category: "Assets", description: "Delete an asset with dependency checking", server: "all" },
  { name: "list_assets", category: "Assets", description: "Browse and search assets by path, type, or tag", server: "all" },
];

export function registerRemoteControlTools(server: McpServer) {
  server.registerTool(
    "ue5_mcp_architecture_guide",
    {
      title: "Compare UE5 MCP Server Architectures",
      description:
        "Compare the three production MCP server implementations for UE5: Official (Remote Control API), ChiR24 (Automation Bridge), and Flopperam (World Building). Returns architecture details, setup steps, and recommendations.",
      inputSchema: {
        architecture: z
          .enum(["all", "remote-control", "automation-bridge", "world-building"])
          .default("all")
          .describe("Which MCP architecture to show details for"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ architecture }) => {
      const archs = architecture === "all"
        ? MCP_ARCHITECTURES
        : MCP_ARCHITECTURES.filter((a) => a.type === architecture);

      let output = `## UE5 MCP Server Architectures\n\n`;

      if (architecture === "all") {
        output += `| Feature | Official (RC API) | ChiR24 (Bridge) | Flopperam (World) |\n`;
        output += `|---------|-------------------|-----------------|--------------------|\n`;
        output += `| Protocol | HTTP/WebSocket | TCP | TCP |\n`;
        output += `| Port | 6766/6767 | 8091 | 6776 |\n`;
        output += `| Language | TypeScript | TS + C++ | Python |\n`;
        output += `| Tools | 24 | 36 | 20+ |\n`;
        output += `| Engine Mod | None (plugin) | C++ plugin | C++ plugin |\n`;
        output += `| Docker Image | Official | Build from src | Build from src |\n\n`;
        output += `**Recommendation**: Start with Official for simplicity, migrate to ChiR24 for performance, use Flopperam for AI-driven world building.\n\n`;
      }

      for (const arch of archs) {
        output += `### ${arch.name}\n`;
        output += `- **Protocol**: ${arch.protocol} (port ${arch.port})\n`;
        output += `- **Language**: ${arch.language}\n`;
        output += `- **Tools**: ${arch.toolCount}\n`;
        output += `- **Best For**: ${arch.bestFor}\n`;
        output += `- **Repository**: ${arch.repo}\n`;
        if (arch.dockerImage) {
          output += `- **Docker Image**: \`${arch.dockerImage}\`\n`;
        }
        output += `\n**Strengths**:\n`;
        arch.strengths.forEach((s) => (output += `- ${s}\n`));
        output += `\n**Setup**:\n\`\`\`\n${arch.setup}\n\`\`\`\n\n`;
      }

      return { content: [{ type: "text", text: output }] };
    }
  );

  server.registerTool(
    "ue5_remote_control_setup",
    {
      title: "Generate Remote Control API Configuration",
      description:
        "Generate the configuration needed to enable the Remote Control API in a UE5 project: DefaultEngine.ini settings, plugin enablement, Docker Compose with MCP server, and verification commands.",
      inputSchema: {
        http_port: z.number().default(6766).describe("HTTP port for Remote Control API"),
        ws_port: z.number().default(6767).describe("WebSocket port for Remote Control API"),
        include_docker: z.boolean().default(true).describe("Include Docker Compose configuration"),
        mcp_server: z
          .enum(["official", "chir24", "flopperam"])
          .default("official")
          .describe("Which MCP server to configure"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ http_port, ws_port, include_docker, mcp_server }) => {
      let output = `## Remote Control API Setup\n\n`;

      // DefaultEngine.ini
      output += `### 1. DefaultEngine.ini\nAdd to your project's \`Config/DefaultEngine.ini\`:\n`;
      output += "```ini\n";
      output += `[/Script/RemoteControlAPI.RemoteControlSettings]\n`;
      output += `bAutoStartRemoteControl=True\n`;
      output += `RemoteControlHttpServerPort=${http_port}\n`;
      output += `RemoteControlWebSocketServerPort=${ws_port}\n`;
      output += "```\n\n";

      // Plugin enablement
      output += `### 2. Enable Plugin\nIn UE5 Editor: **Edit → Plugins → Search "Remote Control" → Enable "Remote Control API" → Restart**\n\n`;

      // Verification
      output += `### 3. Verify Connection\n`;
      output += "```bash\n";
      output += `# Test HTTP endpoint (run after editor starts)\n`;
      output += `curl -s http://localhost:${http_port}/remote/api/v1/objects | jq .\n`;
      output += "```\n\n";

      // Docker compose
      if (include_docker) {
        output += `### 4. Docker Compose with MCP Server\n`;
        output += "```yaml\n";
        output += `services:\n`;

        if (mcp_server === "official") {
          output += `  ue-mcp-server:\n`;
          output += `    image: mcp/unreal-engine-mcp-server:latest\n`;
          output += `    container_name: ue-mcp\n`;
          output += `    environment:\n`;
          output += `      - UE_HOST=host.docker.internal  # or ue5-editor if in same compose\n`;
          output += `      - UE_RC_HTTP_PORT=${http_port}\n`;
          output += `      - UE_RC_WS_PORT=${ws_port}\n`;
          output += `      - LOG_LEVEL=info\n`;
          output += `    stdin_open: true\n`;
          output += `    tty: true\n`;
          output += `    networks:\n`;
          output += `      - ue5-net\n`;
        } else if (mcp_server === "chir24") {
          output += `  mcp-server:\n`;
          output += `    build:\n`;
          output += `      context: ./Unreal_mcp\n`;
          output += `      dockerfile: Dockerfile\n`;
          output += `    container_name: unreal-mcp-server\n`;
          output += `    environment:\n`;
          output += `      - MCP_AUTOMATION_HOST=ue5-editor\n`;
          output += `      - MCP_AUTOMATION_PORT=8091\n`;
          output += `      - MCP_AUTOMATION_ALLOW_NON_LOOPBACK=false\n`;
          output += `      - LOG_LEVEL=info\n`;
          output += `    stdin_open: true\n`;
          output += `    tty: true\n`;
          output += `    networks:\n`;
          output += `      - ue5-net\n`;
        } else {
          output += `  flopperam-mcp:\n`;
          output += `    image: python:3.11-slim\n`;
          output += `    container_name: flopperam-mcp\n`;
          output += `    environment:\n`;
          output += `      - UE_EDITOR_PORT=6776\n`;
          output += `    volumes:\n`;
          output += `      - ./unreal-engine-mcp/Python:/app:ro\n`;
          output += `    working_dir: /app\n`;
          output += `    command: bash -c "pip install uv && python3 -m uv run unreal_mcp_server_advanced.py"\n`;
          output += `    stdin_open: true\n`;
          output += `    tty: true\n`;
          output += `    networks:\n`;
          output += `      - ue5-net\n`;
        }

        output += "```\n\n";
      }

      // Claude Code config
      output += `### 5. Claude Code MCP Configuration (.mcp.json)\n`;
      output += "```json\n";
      if (mcp_server === "official") {
        output += `{\n  "mcpServers": {\n    "unreal-mcp": {\n`;
        output += `      "command": "docker",\n`;
        output += `      "args": ["run", "-i", "--rm", "--network", "ue5-net",\n`;
        output += `               "-e", "UE_HOST=ue5-editor",\n`;
        output += `               "-e", "UE_RC_HTTP_PORT=${http_port}",\n`;
        output += `               "mcp/unreal-engine-mcp-server:latest"]\n`;
        output += `    }\n  }\n}\n`;
      } else {
        output += `{\n  "mcpServers": {\n    "unreal-mcp": {\n`;
        output += `      "command": "docker",\n`;
        output += `      "args": ["exec", "-i", "${mcp_server === "chir24" ? "unreal-mcp-server" : "flopperam-mcp"}", "node", "dist/index.js"]\n`;
        output += `    }\n  }\n}\n`;
      }
      output += "```\n";

      return { content: [{ type: "text", text: output }] };
    }
  );

  server.registerTool(
    "ue5_mcp_tools_reference",
    {
      title: "List Available MCP Tools for UE5",
      description:
        "List all MCP tools available for controlling UE5 via Remote Control API. Filter by category: Actors, Materials, Blueprints, Gameplay, Level, VFX, Animation, AI, Assets.",
      inputSchema: {
        category: z
          .enum(["all", "Actors", "Materials", "Blueprints", "Gameplay", "Level", "VFX", "Animation", "AI", "Assets"])
          .default("all")
          .describe("Filter tools by category"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ category }) => {
      const tools = category === "all"
        ? MCP_TOOLS
        : MCP_TOOLS.filter((t) => t.category === category);

      const categories = [...new Set(tools.map((t) => t.category))];
      let output = `## UE5 MCP Tools Reference\n\n`;
      output += `**${tools.length} tools** available${category !== "all" ? ` in "${category}"` : ""}\n\n`;

      for (const cat of categories) {
        const catTools = tools.filter((t) => t.category === cat);
        output += `### ${cat}\n`;
        catTools.forEach((t) => {
          output += `- **\`${t.name}\`** — ${t.description}\n`;
        });
        output += "\n";
      }

      output += `---\n\n### Example Claude Code Prompts\n\n`;
      output += `\`\`\`\n`;
      output += `# Spawn actors\n`;
      output += `"Spawn 5 cube actors in a grid pattern, apply stone material, enable physics"\n\n`;
      output += `# Setup GAS\n`;
      output += `"Configure GAS: create AttributeSet with Health/Mana, GameplayEffect for damage,\n`;
      output += ` and GameplayAbility for basic attack"\n\n`;
      output += `# Create character\n`;
      output += `"Create Blueprint character with skeletal mesh and enhanced input for movement"\n\n`;
      output += `# Build UI\n`;
      output += `"Create UMG widget: health bar (red), mana bar (blue), player level text"\n`;
      output += `\`\`\`\n`;

      return { content: [{ type: "text", text: output }] };
    }
  );

  server.registerTool(
    "ue5_troubleshoot_mcp",
    {
      title: "Troubleshoot UE5 MCP Issues",
      description:
        "Get diagnostic commands and solutions for common UE5 MCP issues: connection failures, GPU detection, X11 forwarding, slow builds, Vulkan setup.",
      inputSchema: {
        issue: z
          .enum(["mcp-connection", "gpu-detection", "x11-display", "slow-builds", "vulkan-setup", "all"])
          .describe("Type of issue to troubleshoot"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ issue }) => {
      const guides: Record<string, string> = {
        "mcp-connection": `## Troubleshoot: MCP Server Cannot Connect to UE5

**Symptom**: \`Error: Failed to connect to Unreal Engine at {HOST}:{PORT}\`

### Diagnostic Commands
\`\`\`bash
# 1. Verify Remote Control is enabled
# In UE5: Edit → Plugins → Remote Control API (must be enabled)

# 2. Check port binding inside editor container
docker exec ue5-editor lsof -i :6766
docker exec ue5-editor lsof -i :6767

# 3. Test HTTP connectivity
docker exec ue-mcp-server curl -v http://ue5-editor:6766/remote/api/v1/objects

# 4. Check firewall on host
sudo ufw allow 6766/tcp
sudo ufw allow 6767/tcp

# 5. Verify Docker network connectivity
docker network inspect ue5-net
\`\`\`

### DefaultEngine.ini (must include)
\`\`\`ini
[/Script/RemoteControlAPI.RemoteControlSettings]
bAutoStartRemoteControl=True
RemoteControlHttpServerPort=6766
RemoteControlWebSocketServerPort=6767
\`\`\`

### Common Fixes
- Ensure both containers are on the same Docker network
- Use \`--network host\` for lowest latency
- Set \`MCP_AUTOMATION_ALLOW_NON_LOOPBACK=false\` for security`,

        "gpu-detection": `## Troubleshoot: GPU Not Detected in Container

**Symptom**: \`nvidia-smi: Could not load NVIDIA driver\`

### Diagnostic Commands
\`\`\`bash
# 1. Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \\
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit

# 2. Restart Docker
sudo systemctl restart docker

# 3. Test GPU access
docker run --rm --gpus all nvidia/cuda:12.4.1-runtime-ubuntu22.04 nvidia-smi

# 4. Verify compose GPU config
# deploy:
#   resources:
#     reservations:
#       devices:
#         - driver: nvidia
#           count: all
#           capabilities: [gpu, compute, utility, video]
\`\`\`

### Vulkan-Specific GPU Fix
If nvidia-smi works but vulkaninfo only shows llvmpipe, bind-mount NVIDIA libraries:
\`\`\`yaml
volumes:
  - /usr/share/vulkan/icd.d/nvidia_icd.json:/usr/share/vulkan/icd.d/nvidia_icd.json:ro
  - /usr/share/vulkan/implicit_layer.d:/usr/share/vulkan/implicit_layer.d:ro
  - /usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.0:/usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.0:ro
  - /usr/lib/x86_64-linux-gnu/libnvidia-glcore.so.\${NVIDIA_DRIVER_VERSION}:...
  - /usr/lib/x86_64-linux-gnu/libnvidia-glvkspirv.so.\${NVIDIA_DRIVER_VERSION}:...
  - /usr/lib/x86_64-linux-gnu/libnvidia-gpucomp.so.\${NVIDIA_DRIVER_VERSION}:...
  - /usr/lib/x86_64-linux-gnu/libnvidia-glsi.so.\${NVIDIA_DRIVER_VERSION}:...
  - /usr/lib/x86_64-linux-gnu/libnvidia-tls.so.\${NVIDIA_DRIVER_VERSION}:...
\`\`\`
Auto-detect version: \`NVIDIA_DRIVER_VERSION=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader | head -1)\``,

        "x11-display": `## Troubleshoot: X11 Display Not Forwarding

**Symptom**: \`cannot connect to X server\` or blank window

### Diagnostic Commands
\`\`\`bash
# 1. Allow X11 connections on host
xhost +local:docker
xhost +SI:localuser:root

# 2. Verify DISPLAY variable
echo $DISPLAY  # Should be :0 or :1

# 3. Check X11 socket
ls -la /tmp/.X11-unix/

# 4. Check Xauthority
echo $XAUTHORITY
xauth list

# 5. Test X11 inside container
docker exec ue5-editor xeyes
\`\`\`

### Required Volume Mounts
\`\`\`yaml
volumes:
  - /tmp/.X11-unix:/tmp/.X11-unix:rw
  - \${XAUTHORITY}:/tmp/.Xauthority:ro
environment:
  - DISPLAY=\${DISPLAY}
  - XAUTHORITY=/tmp/.Xauthority
\`\`\`

### Common Fixes
- Run \`xhost +local:docker\` before starting containers
- Ensure DISPLAY is exported: \`export DISPLAY=:1\`
- On Wayland: use XWayland socket (\`/tmp/.X11-unix/X0\` or \`:0\`)`,

        "slow-builds": `## Troubleshoot: Slow Build Times in Docker

**Symptom**: Compilation takes 2x+ longer than native

### Performance Optimizations
\`\`\`bash
# 1. Use host network for I/O performance
docker run ... --network host ...

# 2. Mount source as tmpfs (ramdisk) for faster incremental builds
docker run ... --tmpfs /tmp/project:rw,size=20gb ...

# 3. Allocate sufficient resources
docker run ... --memory 32g --cpus 8 ...

# 4. Use ccache for incremental C++ compilation
# In Dockerfile:
RUN apt-get install -y ccache
ENV CCACHE_DIR=/tmp/ccache

# In compose — persist cache:
volumes:
  - ccache-data:/tmp/ccache

# 5. Use shared memory for GPU rendering
shm_size: "8g"
\`\`\`

### Performance Benchmarks (Linux Docker)
| Metric | Native | Docker (Host Net) | Docker (Bridge) |
|--------|--------|--------------------|-----------------|
| Compilation | Baseline | +5-10% | +15-25% |
| PIE Startup | ~2-3s | ~2-4s | ~3-5s |
| Frame Time | 16.7ms | ~16.8ms | ~17-18ms |
| MCP Latency | N/A | <1ms | 1-3ms |
| Memory Overhead | N/A | ~200-400MB | ~300-500MB |`,

        "vulkan-setup": `## Troubleshoot: Vulkan SM6 Setup for UE5

**Symptom**: \`vulkaninfo\` shows only llvmpipe or no devices

### Diagnostic Commands
\`\`\`bash
# 1. Check Vulkan on host
vulkaninfo --summary 2>&1 | grep -E "GPU|deviceName"

# 2. Check Vulkan in container
docker exec ue5-editor vulkaninfo --summary

# 3. Debug Vulkan loader
docker exec ue5-editor bash -c 'VK_LOADER_DEBUG=all vulkaninfo --summary 2>&1 | grep -iE "error|failed|cannot"'

# 4. Check ICD files
docker exec ue5-editor ls -la /usr/share/vulkan/icd.d/

# 5. Check NVIDIA library dependencies
docker exec ue5-editor ldd /usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.0 2>&1 | grep "not found"
\`\`\`

### Required Packages (in Dockerfile)
\`\`\`dockerfile
RUN apt-get install -y \\
    libvulkan1 libvulkan-dev vulkan-tools \\
    mesa-vulkan-drivers
\`\`\`

### Common Fixes
- Bind-mount NVIDIA ICD JSON from host (not included by nvidia-container-toolkit)
- Bind-mount all libnvidia-*.so dependencies found via \`ldd\`
- Set \`NVIDIA_DRIVER_CAPABILITIES=all\` in environment
- Set \`XDG_RUNTIME_DIR=/tmp/runtime-user\` (Vulkan requires this)`,
      };

      let output = "";
      if (issue === "all") {
        for (const [, guide] of Object.entries(guides)) {
          output += guide + "\n\n---\n\n";
        }
      } else {
        output = guides[issue] || `No troubleshooting guide found for "${issue}"`;
      }

      return { content: [{ type: "text", text: output }] };
    }
  );

  server.registerTool(
    "ue5_mcp_security",
    {
      title: "MCP Security Best Practices",
      description:
        "Get security best practices for running MCP servers with UE5: firewall rules, network isolation, volume permissions, and access control.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const output = `## MCP Server Security Best Practices

### 1. Disable Non-Loopback Access
\`\`\`bash
MCP_AUTOMATION_ALLOW_NON_LOOPBACK=false  # Default — keep it!
\`\`\`

### 2. Firewall Rules (UFW)
\`\`\`bash
sudo ufw default deny incoming
sudo ufw allow from 192.168.1.0/24 to any port 6766  # Only trusted subnet
sudo ufw allow from 192.168.1.0/24 to any port 6767
sudo ufw allow from 192.168.1.0/24 to any port 8091
# NEVER: sudo ufw allow 8091  # Exposes to all networks
\`\`\`

### 3. Private Docker Network
\`\`\`yaml
networks:
  ue5-private:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
\`\`\`

### 4. Read-Only Content Volumes
\`\`\`yaml
volumes:
  - ./Content:/tmp/project/Content:ro    # Read-only game assets
  - ./Source:/tmp/project/Source:rw       # Read-write for code gen
\`\`\`

### 5. Never Expose to Public Internet
\`\`\`bash
# BAD — binds to all interfaces
ports:
  - "0.0.0.0:8091:8091"

# GOOD — localhost only
ports:
  - "127.0.0.1:8091:8091"
\`\`\`

### 6. Container User Isolation
\`\`\`dockerfile
# Run as non-root user matching host UID
ARG HOST_UID=1000
RUN useradd -m -u \${HOST_UID} ue5dev
USER ue5dev
\`\`\`

### 7. Environment Variable Hygiene
Never commit MCP credentials or API keys. Use \`.env\` files excluded from git:
\`\`\`bash
echo ".env" >> .gitignore
\`\`\``;

      return { content: [{ type: "text", text: output }] };
    }
  );
}
