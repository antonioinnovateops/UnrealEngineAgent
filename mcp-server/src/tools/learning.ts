import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LEARNING_RESOURCES } from "../data/learning-resources.js";

export function registerLearningTools(server: McpServer) {
  server.registerTool(
    "ue5_find_resources",
    {
      title: "Find UE5 Learning Resources",
      description:
        "Search UE5 learning resources by topic, skill level, or format. Returns courses, tutorials, samples, and community links.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Search term (e.g., 'GAS', 'materials', 'multiplayer')"),
        level: z
          .enum(["beginner", "intermediate", "expert", "all"])
          .default("all")
          .describe("Skill level filter"),
        free_only: z
          .boolean()
          .default(false)
          .describe("Only show free resources"),
        type: z
          .enum(["course", "tutorial", "reference", "sample", "community", "tool", "all"])
          .default("all")
          .describe("Resource type filter"),
        limit: z
          .number()
          .min(1)
          .max(30)
          .default(10)
          .describe("Max results"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ query, level, free_only, type, limit }) => {
      let results = LEARNING_RESOURCES.filter((r) => {
        const matchesQuery =
          !query ||
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.description.toLowerCase().includes(query.toLowerCase()) ||
          r.topics.some((t) => t.toLowerCase().includes(query.toLowerCase()));

        const matchesLevel = level === "all" || r.level === level;
        const matchesFree = !free_only || r.free;
        const matchesType = type === "all" || r.type === type;

        return matchesQuery && matchesLevel && matchesFree && matchesType;
      });

      results = results.slice(0, limit);

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No resources found matching your criteria. Try broader search terms or remove filters.`,
            },
          ],
        };
      }

      const levelEmoji = { beginner: "1", intermediate: "2", expert: "3" };

      const markdown = results
        .map(
          (r) =>
            `### ${r.title}\n` +
            `- **Level**: ${r.level} | **Type**: ${r.type} | **Format**: ${r.format} | ${r.free ? "Free" : "Paid"}\n` +
            `- **URL**: ${r.url}\n` +
            `- **Topics**: ${r.topics.join(", ")}\n` +
            `- ${r.description}\n`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `## UE5 Learning Resources (${results.length} results)\n\n${markdown}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "ue5_learning_path",
    {
      title: "Get UE5 Learning Path",
      description:
        "Get a recommended learning path for a specific UE5 topic or skill level. Returns an ordered sequence of resources from beginner to expert.",
      inputSchema: {
        topic: z
          .enum([
            "getting-started",
            "c++",
            "blueprints",
            "gas",
            "materials",
            "multiplayer",
            "ai",
            "performance",
            "docker",
            "linux",
            "claude-integration",
            "mcp-servers",
            "remote-control",
          ])
          .describe("Topic to build a learning path for"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ topic }) => {
      const paths: Record<string, string> = {
        "getting-started": `## Learning Path: Getting Started with UE5

### Step 1: First Steps (Week 1)
1. **Your First Hour in UE5** — 50-minute guided tutorial
2. **Epic 2025 Crash Course** — Official curated learning path
3. Download **Lyra Starter Game** from Fab — study the architecture

### Step 2: Core Concepts (Weeks 2-3)
4. **Unreal Sensei 5-Hour Tutorial** — Build a photorealistic scene
5. Read the **Allar UE5 Style Guide** — Learn naming conventions
6. Follow **Smart Poly** YouTube channel — Blueprint fundamentals

### Step 3: Build Something (Weeks 4-6)
7. Pick a template (Third Person or First Person)
8. Build a small game with Blueprints
9. Study **Stack-O-Bot** sample for reference architecture

### Step 4: Level Up
10. Start the **GameDev.tv C++ course** or **Epic Coursera Certificate**
11. Join **Unreal Source Discord** for community support`,

        "c++": `## Learning Path: UE5 C++ Development

### Step 1: C++ Foundations (Week 1-2)
1. Read **Epic C++ Coding Standard** — Naming, macros, conventions
2. **GameDev.tv UE5 C++ Developer Course** — Learn from zero
3. Study Lyra's source code for production patterns

### Step 2: Intermediate (Weeks 3-4)
4. **Alex Forsythe** videos — Framework architecture deep-dives
5. **Stephen Ulibarri C++ Ultimate Course** — Build complete RPG
6. Study **Stack-O-Bot** and **Cropout** samples

### Step 3: Advanced (Weeks 5-8)
7. **Tom Looman Professional Game Dev Course** — Expert-level
8. Study **ActionRoguelike** GitHub repository — 4,400+ stars
9. Learn GAS with **Druid Mechanics** course

### Step 4: Mastery
10. Build from UE5 source on Linux
11. Use Rider + Claude Code for rapid iteration
12. Contribute to open-source UE5 projects`,

        "gas": `## Learning Path: Gameplay Ability System (GAS)

### Step 1: Prerequisites
1. Comfortable with UE5 C++ (classes, macros, components)
2. Understand the gameplay framework (GameMode → Character hierarchy)
3. Download and study **Lyra** — it uses GAS extensively

### Step 2: GAS Fundamentals (Week 1-2)
4. Read **GASDocumentation** by Dan Tranek (GitHub) — The definitive reference
5. Understand core concepts: ASC, Abilities, Effects, Tags, Attributes, Cues
6. Create your first AttributeSet (Health, Mana)

### Step 3: Deep Dive (Weeks 3-4)
7. **Druid Mechanics GAS Top-Down RPG Course** — Most comprehensive
8. Implement GameplayEffects: Instant, Duration, Infinite
9. Build an ability system with cooldowns and costs

### Step 4: Advanced (Weeks 5-8)
10. Multiplayer GAS — Replication modes, prediction, rollback
11. Study **Narxim-GAS-Example** for clean starter architecture
12. Build complex abilities: Projectiles, AoE, channeled spells
13. Use AbilityTasks for async gameplay logic`,

        "multiplayer": `## Learning Path: UE5 Multiplayer

### Step 1: Networking Fundamentals (Week 1)
1. Official docs: "Networking and Multiplayer in Unreal Engine"
2. **Alex Forsythe** multiplayer essentials video
3. Understand: Authority, Replication, RPCs, Ownership

### Step 2: Implementation (Weeks 2-3)
4. Property replication with UPROPERTY(Replicated)
5. RPCs: Server, Client, NetMulticast
6. GetLifetimeReplicatedProps() setup

### Step 3: Advanced (Weeks 4-6)
7. **Tom Looman** multiplayer module in Professional Course
8. Study **UE5_EOSTemplate** — EOS + Steam integration
9. Study **JustAnotherLobby** — C++ lobby system

### Step 4: Production
10. Use GAS with multiplayer (prediction, rollback)
11. Deploy dedicated servers with Docker
12. Implement Epic Online Services for matchmaking`,

        "materials": `## Learning Path: UE5 Materials and Rendering

### Step 1: Fundamentals (Week 1-2)
1. Official docs: Materials section
2. **Ben Cloward** — Start from material basics (130+ videos)
3. Understand PBR: Base Color, Roughness, Metallic, Normal

### Step 2: Intermediate (Weeks 3-4)
4. **Ben Cloward** advanced materials — Procedural textures, blending
5. Material Instances and parameter collections
6. **William Faucher** — Lumen lighting tutorials

### Step 3: Advanced (Weeks 5-8)
7. Custom HLSL in material editor
8. Substrate materials (UE 5.7 production-ready)
9. NPR/Cel-shading techniques
10. **Nanite Deep Dive** (Tricky Bits Blog)
11. **NVIDIA UE5 Raytracing Guide** for Lumen internals`,

        "docker": `## Learning Path: UE5 Docker Development

### Step 1: Docker Basics
1. Understand Docker fundamentals (images, containers, volumes)
2. Link GitHub account to Epic Games account for GHCR access

### Step 2: UE5 Containers (Week 1)
3. Pull Epic's official images from ghcr.io/epicgames/unreal-engine
4. Explore unrealcontainers.com — Community hub
5. Install NVIDIA Container Toolkit for GPU access

### Step 3: Build Pipelines (Week 2)
6. Create multi-stage Dockerfiles (build → deploy)
7. Set up docker-compose for full server stack
8. Configure CI/CD (GitHub Actions or GitLab CI)

### Step 4: Production
9. Deploy dedicated game servers
10. Set up pixel streaming with signaling server
11. Monitor container performance (< 0.5ms overhead)`,

        "linux": `## Learning Path: UE5 on Linux

### Step 1: Setup (Day 1)
1. Official Linux Quickstart guide
2. Install from pre-built binaries or build from source
3. Set up clang-20.1.8 toolchain

### Step 2: Configuration (Day 2)
4. Enable Vulkan SM6 (disable SM5!)
5. Install GPU drivers (NVIDIA 535+ or AMD RADV 25.0.0+)
6. Configure Rider or VS Code

### Step 3: Development (Week 1)
7. Set up LLDB with Epic data formatters
8. Learn Unreal Insights profiling on Linux
9. Handle Fab content without Epic Launcher

### Step 4: Advanced
10. Docker containerization for CI/CD
11. Build from source for custom engine modifications
12. Performance profiling with perf and nvidia-smi`,

        "claude-integration": `## Learning Path: Claude Code + UE5

### Step 1: Setup (Day 1)
1. Install Claude Code CLI
2. Create CLAUDE.md at project root (use ue5_generate_claude_md tool)
3. Configure .claude/settings.json to exclude Binaries/Intermediate/Saved

### Step 2: Plugins (Day 2)
4. Install **UnrealClaude** (free, 20+ MCP tools) OR
5. Install **CLAUDIUS CODE** ($49.99, 130+ commands)
6. Configure MCP connection between editor and Claude Code

### Step 3: Workflow (Week 1)
7. Set up **Rider + Claude Code terminal** workflow
8. Use Live Coding hot-reload for rapid iteration
9. Learn prompting patterns for UE5 C++ (specify class names, parent classes, macros)

### Step 4: Advanced
10. Install **Node to Code** for Blueprint → C++ conversion
11. Use \`/clear\` between unrelated tasks for context management
12. Build custom CLAUDE.md with progressive disclosure`,

        "ai": `## Learning Path: UE5 AI Development

### Step 1: Fundamentals (Week 1)
1. Official docs: "Artificial Intelligence in Unreal Engine"
2. Understand AI Controllers and Pawn possession
3. Basic NavMesh setup and pathfinding

### Step 2: Behavior Trees (Weeks 2-3)
4. Official Behavior Trees documentation
5. Tasks, Decorators, Services, Composites (Selector, Sequence)
6. Blackboard for shared AI memory

### Step 3: Advanced (Weeks 4-6)
7. Environment Query System (EQS)
8. **Tom Looman** AI module — Professional course
9. Mass Entity for crowd simulation

### Step 4: Production
10. Perception system (sight, hearing, damage)
11. Squad-based AI coordination
12. Performance optimization for many AI agents`,

        "performance": `## Learning Path: UE5 Performance Optimization

### Step 1: Fundamentals
1. Understand frame budgets (16.6ms for 60fps, 8.3ms for 120fps)
2. Learn Unreal Insights profiling tool
3. stat commands: stat fps, stat unit, stat scenerendering

### Step 2: Rendering (Weeks 1-2)
4. Nanite optimization — Cluster count, overdraw
5. Lumen optimization — Screen traces vs hardware RT
6. Virtual Shadow Maps — Page pool management
7. **8-episode open-world performance tutorial** (community)

### Step 3: CPU (Weeks 3-4)
8. Tick optimization — Disable unnecessary ticks
9. Object pooling for spawned actors
10. Async loading and streaming
11. World Partition and HLOD setup

### Step 4: Advanced
12. **AMD GPUOpen UE5 Performance Guide**
13. **NVIDIA UE5 Raytracing Guide**
14. **Tom Looman** performance analysis blog posts
15. Docker containerized benchmarking`,

        "blueprints": `## Learning Path: UE5 Blueprint Visual Scripting

### Step 1: Fundamentals (Week 1)
1. Official Blueprints documentation
2. **Epic 2025 Crash Course** — Blueprint-focused sections
3. **Unreal Sensei** 5-hour tutorial — Blueprint basics

### Step 2: Intermediate (Weeks 2-3)
4. **Smart Poly** YouTube — Blueprint fundamentals playlist
5. Event-driven programming patterns
6. Blueprint Interfaces for communication
7. Timelines, delays, and async operations

### Step 3: Advanced (Weeks 4-6)
8. Blueprint Nativization — Convert to C++ for performance
9. **Node to Code** tool — Blueprint graphs to C++ automatically
10. Data-driven design with DataTables and DataAssets
11. Networking Blueprints — Replication and RPCs

### Step 4: Integration
12. Mixing C++ and Blueprints effectively
13. Creating Blueprint-callable C++ functions
14. BlueprintImplementableEvents for designer customization`,

        "mcp-servers": `## Learning Path: UE5 MCP Servers

### Step 1: Understand the Landscape
1. Three production MCP implementations exist:
   - **Official** (Remote Control API) — HTTP/WS, port 6766/6767, TypeScript
   - **ChiR24** (Automation Bridge) — TCP, port 8091, C++ plugin
   - **Flopperam** (World Building) — TCP, port 6776, Python
2. Use \`ue5_mcp_architecture_guide\` tool for detailed comparison

### Step 2: Start with Official MCP (Week 1)
3. Enable Remote Control Plugin in UE5 Editor
4. Configure DefaultEngine.ini with auto-start
5. Pull Docker image: \`docker pull mcp/unreal-engine-mcp-server:latest\`
6. Test connectivity: \`curl http://localhost:6766/remote/api/v1/objects\`

### Step 3: Docker Integration (Week 2)
7. Create Docker Compose with UE5 editor + MCP server
8. Configure Claude Code .mcp.json for Docker-based MCP
9. Test MCP tools: spawn_actor, create_material, create_blueprint

### Step 4: Advanced
10. Try ChiR24 Automation Bridge for performance-critical workflows
11. Try Flopperam for AI-driven world building
12. Set up security: private Docker networks, read-only volumes, firewall rules
13. All three can coexist in the same Docker Compose stack`,

        "remote-control": `## Learning Path: UE5 Remote Control API

### Step 1: Fundamentals
1. Read official docs: "Remote Control API for Unreal Engine"
2. Enable plugin: Edit → Plugins → Remote Control API
3. Understand HTTP (port 6766) vs WebSocket (port 6767) protocols

### Step 2: Configuration
4. Add to DefaultEngine.ini:
   \`\`\`ini
   [/Script/RemoteControlAPI.RemoteControlSettings]
   bAutoStartRemoteControl=True
   RemoteControlHttpServerPort=6766
   RemoteControlWebSocketServerPort=6767
   \`\`\`
5. Verify: \`curl http://localhost:6766/remote/api/v1/objects\`

### Step 3: Using with MCP
6. Connect MCP server to Remote Control endpoints
7. Available tool categories: Actors, Materials, Blueprints, Gameplay, Level, VFX, Animation, AI, Assets
8. Use \`ue5_mcp_tools_reference\` for full tool list

### Step 4: Docker Deployment
9. Run MCP server in Docker with env vars (UE_HOST, UE_RC_HTTP_PORT)
10. Configure Docker networking (bridge or host mode)
11. Security: MCP_AUTOMATION_ALLOW_NON_LOOPBACK=false, UFW firewall rules`,
      };

      const path = paths[topic];
      if (!path) {
        return {
          content: [
            {
              type: "text",
              text: `No learning path available for "${topic}". Available topics: ${Object.keys(paths).join(", ")}`,
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: path }],
      };
    }
  );
}
