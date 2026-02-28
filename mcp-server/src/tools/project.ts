import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readdir, readFile, stat } from "fs/promises";
import { join, extname, basename } from "path";

export function registerProjectTools(server: McpServer) {
  server.registerTool(
    "ue5_analyze_project",
    {
      title: "Analyze UE5 Project Structure",
      description:
        "Analyze a UE5 project directory to identify modules, plugins, key classes, and architecture patterns. Reads .uproject file and scans Source/ directory.",
      inputSchema: {
        project_path: z
          .string()
          .describe("Absolute path to UE5 project root (containing .uproject file)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ project_path }) => {
      try {
        // Find .uproject file
        const files = await readdir(project_path);
        const uprojectFile = files.find((f) => f.endsWith(".uproject"));

        if (!uprojectFile) {
          return {
            content: [
              {
                type: "text",
                text: `No .uproject file found in "${project_path}". Is this a valid UE5 project directory?`,
              },
            ],
          };
        }

        // Parse .uproject
        const uprojectContent = await readFile(
          join(project_path, uprojectFile),
          "utf-8"
        );
        const uproject = JSON.parse(uprojectContent);

        let output = `## UE5 Project Analysis: ${basename(uprojectFile, ".uproject")}\n\n`;
        output += `### Project File\n`;
        output += `- **Engine Version**: ${uproject.EngineAssociation || "Unknown"}\n`;
        output += `- **Category**: ${uproject.Category || "Game"}\n`;

        // Modules
        if (uproject.Modules) {
          output += `\n### Modules (${uproject.Modules.length})\n`;
          for (const mod of uproject.Modules) {
            output += `- **${mod.Name}** — Type: ${mod.Type}, Loading: ${mod.LoadingPhase || "Default"}\n`;
          }
        }

        // Plugins
        if (uproject.Plugins) {
          const enabledPlugins = uproject.Plugins.filter(
            (p: { Enabled: boolean }) => p.Enabled
          );
          output += `\n### Enabled Plugins (${enabledPlugins.length})\n`;
          for (const plugin of enabledPlugins) {
            output += `- ${plugin.Name}\n`;
          }
        }

        // Scan Source directory
        const sourcePath = join(project_path, "Source");
        try {
          const sourceFiles = await scanDirectory(sourcePath);
          const headers = sourceFiles.filter((f) => f.endsWith(".h"));
          const sources = sourceFiles.filter((f) => f.endsWith(".cpp"));

          output += `\n### Source Files\n`;
          output += `- **Headers (.h)**: ${headers.length}\n`;
          output += `- **Sources (.cpp)**: ${sources.length}\n`;

          // Detect key patterns
          const patterns: string[] = [];
          const fileContents = await Promise.all(
            headers.slice(0, 50).map(async (f) => {
              try {
                return await readFile(f, "utf-8");
              } catch {
                return "";
              }
            })
          );
          const allContent = fileContents.join("\n");

          if (allContent.includes("UAbilitySystemComponent"))
            patterns.push("Gameplay Ability System (GAS)");
          if (allContent.includes("UInputMappingContext"))
            patterns.push("Enhanced Input");
          if (allContent.includes("UCommonActivatableWidget"))
            patterns.push("CommonUI");
          if (allContent.includes("GetLifetimeReplicatedProps"))
            patterns.push("Multiplayer Replication");
          if (allContent.includes("UBehaviorTree"))
            patterns.push("AI Behavior Trees");
          if (allContent.includes("UNiagaraComponent"))
            patterns.push("Niagara VFX");
          if (allContent.includes("UGameplayStatics"))
            patterns.push("Gameplay Statics Usage");

          if (patterns.length > 0) {
            output += `\n### Detected Patterns\n`;
            patterns.forEach((p) => (output += `- ${p}\n`));
          }
        } catch {
          output += `\n*Source directory not found or not accessible.*\n`;
        }

        // Check for CLAUDE.md
        try {
          await stat(join(project_path, "CLAUDE.md"));
          output += `\n### Claude Integration\n- CLAUDE.md found at project root\n`;
        } catch {
          output += `\n### Claude Integration\n- No CLAUDE.md found. Consider creating one for better AI assistance.\n`;
        }

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error analyzing project: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "ue5_generate_claude_md",
    {
      title: "Generate CLAUDE.md Template",
      description:
        "Generate a CLAUDE.md file template for a UE5 project. Provides the structure and content that helps Claude Code understand your project architecture.",
      inputSchema: {
        project_name: z.string().describe("Project name in PascalCase"),
        engine_version: z
          .string()
          .default("5.7")
          .describe("UE version (e.g., 5.7)"),
        systems: z
          .array(z.string())
          .default([])
          .describe("Key systems used (e.g., GAS, Enhanced Input, CommonUI, Multiplayer)"),
        primary_language: z
          .enum(["cpp", "blueprint", "both"])
          .default("both")
          .describe("Primary development language"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ project_name, engine_version, systems, primary_language }) => {
      const systemsList = systems.length > 0 ? systems.join(", ") : "Enhanced Input";

      const languageNote =
        primary_language === "cpp"
          ? "C++ primary"
          : primary_language === "blueprint"
            ? "Blueprint primary"
            : "C++ with Blueprint extension";

      const template = `# ${project_name}

## Tech Stack
- Unreal Engine ${engine_version}
- ${languageNote}
- Key systems: ${systemsList}

## Project Structure
\`\`\`
Source/
├── ${project_name}/          # Primary game module
│   ├── Public/
│   │   ├── Characters/       # Player and NPC characters
│   │   ├── Components/       # Reusable actor components
│   │   ├── Abilities/        # GAS abilities and effects
│   │   ├── UI/               # UMG widget classes
│   │   └── Core/             # GameMode, GameState, etc.
│   └── Private/
│       ├── Characters/
│       ├── Components/
│       ├── Abilities/
│       ├── UI/
│       └── Core/
Plugins/
├── GameFeatures/             # Modular game features
Content/
├── Blueprints/               # BP_ prefixed assets
├── Maps/                     # Level maps
├── Materials/                # M_ and MI_ assets
├── Meshes/                   # SM_ and SK_ assets
├── Textures/                 # T_ prefixed textures
├── UI/                       # WBP_ widget blueprints
├── Audio/                    # SC_ sound cues
└── Data/                     # DT_ data tables, DA_ data assets
\`\`\`

## Coding Conventions
- Follow Epic C++ Coding Standard
- Prefixes: A (Actor), U (UObject), F (struct), E (enum), I (interface)
- Boolean vars: \`bIsAlive\`, \`bCanFire\`
- Use \`TObjectPtr<>\` for UObject pointers (UE 5.0+)
- Use \`GENERATED_BODY()\` in every UObject-derived class
- \`#pragma once\` for include guards
- Forward-declare in headers, include in .cpp

## Build Commands
\`\`\`bash
# Development editor build
[UE_ROOT]/Engine/Build/BatchFiles/Linux/Build.sh ${project_name}Editor Linux Development \\
  -project=$(pwd)/${project_name}.uproject

# Package for shipping
[UE_ROOT]/Engine/Build/BatchFiles/RunUAT.sh BuildCookRun \\
  -project=$(pwd)/${project_name}.uproject \\
  -platform=Linux -clientconfig=Shipping \\
  -cook -build -stage -pak
\`\`\`

## Gameplay Architecture
\`\`\`
UGameInstance
└── A${project_name}GameMode
    ├── A${project_name}GameState
    ├── A${project_name}PlayerController
    │   ├── A${project_name}PlayerState
    │   └── A${project_name}Character (Possessed)
    └── A${project_name}HUD
\`\`\`

## Key Classes
<!-- List your 5-10 most important classes here -->
- \`A${project_name}Character\` — Main player character
- \`A${project_name}GameMode\` — Game rules and player spawning
- \`A${project_name}PlayerController\` — Input handling and UI management

## Notes for Claude
- Check Source/${project_name}/Public/ for headers before suggesting new classes
- Use existing naming patterns when creating new files
- Run build command after code changes to verify compilation
`;

      return {
        content: [
          {
            type: "text",
            text: `## Generated CLAUDE.md Template\n\nSave this as \`CLAUDE.md\` at your project root:\n\n\`\`\`markdown\n${template}\`\`\``,
          },
        ],
      };
    }
  );
}

// Helper: recursively scan directory for files
async function scanDirectory(dirPath: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (!["Intermediate", "Binaries", "Saved", "DerivedDataCache", ".git", "node_modules"].includes(entry.name)) {
          results.push(...(await scanDirectory(fullPath)));
        }
      } else if ([".h", ".cpp", ".cs"].includes(extname(entry.name))) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory not accessible
  }
  return results;
}
