import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { UE5_CLASSES, UE5_CATEGORIES } from "../data/ue5-api-index.js";

export function registerDocTools(server: McpServer) {
  server.registerTool(
    "ue5_search_api",
    {
      title: "Search UE5 API Reference",
      description:
        "Search the Unreal Engine 5 API class index by name, category, or module. Returns class info, parent hierarchy, header paths, and descriptions.",
      inputSchema: {
        query: z
          .string()
          .describe("Search term — class name, category, or keyword"),
        category: z
          .enum([
            "Framework",
            "Components",
            "GAS",
            "Input",
            "AI",
            "UI",
            "Subsystems",
            "Rendering",
            "all",
          ])
          .optional()
          .describe("Filter by category"),
        limit: z
          .number()
          .min(1)
          .max(50)
          .default(10)
          .describe("Max results to return"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ query, category, limit }) => {
      const queryLower = query.toLowerCase();
      let results = UE5_CLASSES.filter((cls) => {
        const matchesQuery =
          cls.name.toLowerCase().includes(queryLower) ||
          cls.description.toLowerCase().includes(queryLower) ||
          cls.module.toLowerCase().includes(queryLower) ||
          cls.category.toLowerCase().includes(queryLower);

        const matchesCategory =
          !category || category === "all" || cls.category === category;

        return matchesQuery && matchesCategory;
      });

      results = results.slice(0, limit);

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No UE5 classes found matching "${query}"${category && category !== "all" ? ` in category "${category}"` : ""}. Try a broader search term.`,
            },
          ],
        };
      }

      const markdown = results
        .map(
          (cls) =>
            `### ${cls.name}\n` +
            `- **Module**: ${cls.module}\n` +
            `- **Parent**: ${cls.parent}\n` +
            `- **Header**: \`${cls.headerPath}\`\n` +
            `- **Category**: ${cls.category}\n` +
            `- ${cls.description}\n`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `## UE5 API Search: "${query}" (${results.length} results)\n\n${markdown}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "ue5_class_hierarchy",
    {
      title: "Get UE5 Class Hierarchy",
      description:
        "Show the inheritance hierarchy for a specific UE5 class, including all known parent classes and siblings.",
      inputSchema: {
        class_name: z
          .string()
          .describe("UE5 class name (e.g., ACharacter, UAbilitySystemComponent)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ class_name }) => {
      const cls = UE5_CLASSES.find(
        (c) => c.name.toLowerCase() === class_name.toLowerCase()
      );

      if (!cls) {
        return {
          content: [
            {
              type: "text",
              text: `Class "${class_name}" not found in the index. Available classes: ${UE5_CLASSES.map((c) => c.name).join(", ")}`,
            },
          ],
        };
      }

      // Build hierarchy chain
      const hierarchy: string[] = [cls.name];
      let current = cls;
      while (current) {
        const parent = UE5_CLASSES.find((c) => c.name === current.parent);
        if (parent) {
          hierarchy.unshift(parent.name);
          current = parent;
        } else {
          if (current.parent && current.parent !== "UObject") {
            hierarchy.unshift(current.parent);
          }
          hierarchy.unshift("UObject");
          break;
        }
      }

      // Find children
      const children = UE5_CLASSES.filter((c) => c.parent === cls.name);

      // Find siblings
      const siblings = UE5_CLASSES.filter(
        (c) => c.parent === cls.parent && c.name !== cls.name
      );

      let output = `## Class Hierarchy: ${cls.name}\n\n`;
      output += `### Inheritance Chain\n`;
      output += hierarchy
        .map((name, i) => `${"  ".repeat(i)}${i === hierarchy.length - 1 ? "**" + name + "**" : name}`)
        .join(" →\n");
      output += "\n\n";

      output += `### Details\n`;
      output += `- **Module**: ${cls.module}\n`;
      output += `- **Header**: \`#include "${cls.headerPath}"\`\n`;
      output += `- ${cls.description}\n\n`;

      if (children.length > 0) {
        output += `### Direct Children (${children.length})\n`;
        children.forEach((child) => {
          output += `- **${child.name}** — ${child.description}\n`;
        });
        output += "\n";
      }

      if (siblings.length > 0) {
        output += `### Siblings (same parent: ${cls.parent})\n`;
        siblings.forEach((sib) => {
          output += `- **${sib.name}** — ${sib.description}\n`;
        });
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }
  );

  server.registerTool(
    "ue5_list_categories",
    {
      title: "List UE5 API Categories",
      description:
        "List all available UE5 class categories with counts. Useful for discovering what's available in the API index.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const categoryCounts = UE5_CATEGORIES.map((cat) => ({
        category: cat,
        count: UE5_CLASSES.filter((c) => c.category === cat).length,
      }));

      let output = `## UE5 API Categories\n\n`;
      output += `| Category | Classes |\n|----------|--------|\n`;
      categoryCounts.forEach(({ category, count }) => {
        output += `| ${category} | ${count} |\n`;
      });
      output += `\n**Total classes indexed**: ${UE5_CLASSES.length}\n`;

      return {
        content: [{ type: "text", text: output }],
      };
    }
  );

  server.registerTool(
    "ue5_doc_url",
    {
      title: "Get UE5 Documentation URL",
      description:
        "Generate the official Epic documentation URL for a specific UE5 topic, class, or system.",
      inputSchema: {
        topic: z
          .string()
          .describe("Topic to look up (e.g., 'Gameplay Ability System', 'Nanite', 'Enhanced Input')"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ topic }) => {
      const DOC_BASE = "dev.epicgames.com/documentation/en-us/unreal-engine";

      const topicMap: Record<string, string> = {
        "gas": `${DOC_BASE}/gameplay-ability-system-for-unreal-engine`,
        "gameplay ability system": `${DOC_BASE}/gameplay-ability-system-for-unreal-engine`,
        "enhanced input": `${DOC_BASE}/enhanced-input-in-unreal-engine`,
        "nanite": `${DOC_BASE}/nanite-virtualized-geometry-in-unreal-engine`,
        "lumen": `${DOC_BASE}/lumen-global-illumination-and-reflections-in-unreal-engine`,
        "niagara": `${DOC_BASE}/creating-visual-effects-in-niagara-for-unreal-engine`,
        "world partition": `${DOC_BASE}/world-partition-in-unreal-engine`,
        "blueprints": `${DOC_BASE}/blueprints-visual-scripting-in-unreal-engine`,
        "c++": `${DOC_BASE}/programming-with-cplusplus-in-unreal-engine`,
        "coding standard": `${DOC_BASE}/epic-cplusplus-coding-standard-for-unreal-engine`,
        "materials": `${DOC_BASE}/unreal-engine-materials`,
        "animation": `${DOC_BASE}/skeletal-mesh-animation-system-in-unreal-engine`,
        "ai": `${DOC_BASE}/artificial-intelligence-in-unreal-engine`,
        "behavior trees": `${DOC_BASE}/behavior-trees-in-unreal-engine`,
        "networking": `${DOC_BASE}/networking-and-multiplayer-in-unreal-engine`,
        "umg": `${DOC_BASE}/umg-ui-designer-for-unreal-engine`,
        "common ui": `${DOC_BASE}/common-ui-plugin-for-advanced-user-interfaces-in-unreal-engine`,
        "linux": `${DOC_BASE}/linux-development-quickstart-for-unreal-engine`,
        "pcg": `${DOC_BASE}/procedural-content-generation-framework-in-unreal-engine`,
        "mass entity": `${DOC_BASE}/mass-entity-in-unreal-engine`,
        "chaos": `${DOC_BASE}/chaos-physics-in-unreal-engine`,
        "metasounds": `${DOC_BASE}/metasounds-in-unreal-engine`,
        "pixel streaming": `${DOC_BASE}/pixel-streaming-in-unreal-engine`,
        "api": `${DOC_BASE}/API`,
        "blueprint api": `${DOC_BASE}/BlueprintAPI`,
      };

      const topicLower = topic.toLowerCase();
      const matchedUrl = topicMap[topicLower];

      if (matchedUrl) {
        return {
          content: [
            {
              type: "text",
              text: `## UE5 Documentation: ${topic}\n\n**URL**: https://${matchedUrl}\n\nOpen this URL in your browser for the official Epic documentation.`,
            },
          ],
        };
      }

      // Fuzzy search
      const matches = Object.entries(topicMap).filter(([key]) =>
        key.includes(topicLower) || topicLower.includes(key)
      );

      if (matches.length > 0) {
        const output = matches
          .map(([key, url]) => `- **${key}**: https://${url}`)
          .join("\n");
        return {
          content: [
            {
              type: "text",
              text: `## Possible matches for "${topic}"\n\n${output}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `No documentation URL found for "${topic}". Try searching at:\nhttps://${DOC_BASE}/\n\nAvailable topics: ${Object.keys(topicMap).join(", ")}`,
          },
        ],
      };
    }
  );
}
