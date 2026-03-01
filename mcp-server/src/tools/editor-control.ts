import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// --- Configuration ---

function getConfig() {
  return {
    host: process.env.UE5_HOST || "localhost",
    port: parseInt(process.env.UE5_RC_PORT || "30010", 10),
  };
}

function baseUrl(): string {
  const { host, port } = getConfig();
  return `http://${host}:${port}`;
}

// --- HTTP Client ---

interface RcResponse {
  ok: boolean;
  status: number;
  data: any;
}

async function rcFetch(
  path: string,
  method: "GET" | "PUT" | "POST" | "DELETE" = "GET",
  body?: unknown
): Promise<RcResponse> {
  const url = `${baseUrl()}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let data: any;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after 10s`);
    }
    throw new Error(`Failed to connect to UE5 editor at ${url}: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

// --- MCP Response Helpers ---

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

// --- Lookup Maps ---

const ENGINE_MESHES: Record<string, string> = {
  Cube: "/Engine/BasicShapes/Cube.Cube",
  Sphere: "/Engine/BasicShapes/Sphere.Sphere",
  Cylinder: "/Engine/BasicShapes/Cylinder.Cylinder",
  Cone: "/Engine/BasicShapes/Cone.Cone",
  Plane: "/Engine/BasicShapes/Plane.Plane",
};

const ACTOR_CLASSES: Record<string, string> = {
  StaticMeshActor: "/Script/Engine.StaticMeshActor",
  PointLight: "/Script/Engine.PointLight",
  SpotLight: "/Script/Engine.SpotLight",
  DirectionalLight: "/Script/Engine.DirectionalLight",
  CameraActor: "/Script/Engine.CameraActor",
  PlayerStart: "/Script/Engine.PlayerStart",
  TriggerBox: "/Script/Engine.TriggerBox",
  TriggerSphere: "/Script/Engine.TriggerSphere",
  BlockingVolume: "/Script/Engine.BlockingVolume",
  ExponentialHeightFog: "/Script/Engine.ExponentialHeightFog",
  SkyLight: "/Script/Engine.SkyLight",
  DecalActor: "/Script/Engine.DecalActor",
  Note: "/Script/Engine.Note",
  TextRenderActor: "/Script/Engine.TextRenderActor",
};

// --- Reusable Zod Schemas ---

const LocationSchema = z
  .object({
    x: z.number().default(0),
    y: z.number().default(0),
    z: z.number().default(0),
  })
  .optional()
  .describe("World location {x, y, z}");

const RotationSchema = z
  .object({
    pitch: z.number().default(0),
    yaw: z.number().default(0),
    roll: z.number().default(0),
  })
  .optional()
  .describe("Rotation {pitch, yaw, roll} in degrees");

const ScaleSchema = z
  .object({
    x: z.number().default(1),
    y: z.number().default(1),
    z: z.number().default(1),
  })
  .optional()
  .describe("Scale {x, y, z}");

// --- RC API call helper ---

async function rcCall(objectPath: string, functionName: string, parameters?: Record<string, any>) {
  return rcFetch("/remote/object/call", "PUT", {
    objectPath,
    functionName,
    parameters: parameters || {},
    generateTransaction: true,
  });
}

async function rcProperty(objectPath: string, propertyName: string, propertyValue?: any) {
  const body: any = { objectPath, propertyName };
  if (propertyValue !== undefined) {
    body.propertyValue = propertyValue;
    return rcFetch("/remote/object/property", "PUT", body);
  }
  // GET property via access: "READ_ACCESS"
  body.access = "READ_ACCESS";
  return rcFetch("/remote/object/property", "PUT", body);
}

// --- Tool Registration ---

export function registerEditorControlTools(server: McpServer) {
  // 1. ue5_connect — Test editor connection
  server.registerTool(
    "ue5_connect",
    {
      title: "Test UE5 Editor Connection",
      description:
        "Test connectivity to the UE5 editor's Remote Control API. Returns editor info and version if connected.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const res = await rcFetch("/remote/info", "GET");
        if (!res.ok) {
          return errorResult(`Editor returned HTTP ${res.status}: ${JSON.stringify(res.data)}`);
        }
        const { host, port } = getConfig();
        let output = `## UE5 Editor Connected\n\n`;
        output += `- **Endpoint**: ${host}:${port}\n`;
        if (typeof res.data === "object") {
          for (const [key, value] of Object.entries(res.data)) {
            output += `- **${key}**: ${JSON.stringify(value)}\n`;
          }
        }
        output += `\nRemote Control API is active and responding.`;
        return textResult(output);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 2. ue5_spawn_actor — Spawn actor with optional mesh/label/scale
  server.registerTool(
    "ue5_spawn_actor",
    {
      title: "Spawn Actor in UE5 Editor",
      description:
        "Spawn an actor in the current level. Optionally set mesh (Cube/Sphere/Cylinder/Cone/Plane or full path), label, location, rotation, scale, and physics simulation. Returns the spawned actor path.",
      inputSchema: {
        actor_class: z
          .string()
          .default("StaticMeshActor")
          .describe(
            `Actor class shorthand (${Object.keys(ACTOR_CLASSES).join(", ")}) or full /Script/... path`
          ),
        mesh: z
          .string()
          .optional()
          .describe(
            `Mesh shorthand (${Object.keys(ENGINE_MESHES).join(", ")}) or full asset path`
          ),
        label: z.string().optional().describe("Display label for the actor"),
        location: LocationSchema,
        rotation: RotationSchema,
        scale: ScaleSchema,
        simulate_physics: z
          .boolean()
          .default(false)
          .describe("Enable physics simulation (sets Mobility to Movable, enables gravity)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ actor_class, mesh, label, location, rotation, scale, simulate_physics }) => {
      try {
        // Resolve actor class
        const classPath = ACTOR_CLASSES[actor_class] || actor_class;

        // Step 1: Spawn actor via EditorActorSubsystem
        const spawnRes = await rcCall(
          "/Script/UnrealEd.Default__EditorActorSubsystem",
          "SpawnActorFromClass",
          {
            ActorClass: classPath,
            Location: location
              ? { X: location.x, Y: location.y, Z: location.z }
              : { X: 0, Y: 0, Z: 0 },
          }
        );

        if (!spawnRes.ok) {
          return errorResult(`Spawn failed (HTTP ${spawnRes.status}): ${JSON.stringify(spawnRes.data)}`);
        }

        const actorPath = spawnRes.data?.ReturnValue;
        if (!actorPath) {
          return errorResult(`Spawn returned no actor path. Response: ${JSON.stringify(spawnRes.data)}`);
        }

        const steps: string[] = [`Spawned \`${classPath}\` → \`${actorPath}\``];

        // Step 2: Set mesh if specified
        if (mesh) {
          const meshPath = ENGINE_MESHES[mesh] || mesh;
          const meshComp = `${actorPath}.StaticMeshComponent0`;
          const meshRes = await rcCall(meshComp, "SetStaticMesh", { NewMesh: meshPath });
          if (meshRes.ok) {
            steps.push(`Set mesh: ${meshPath}`);
          } else {
            steps.push(`Warning: Failed to set mesh (${meshRes.status})`);
          }
        }

        // Step 3: Enable physics (must set Movable before SetSimulatePhysics)
        if (simulate_physics) {
          const meshComp = `${actorPath}.StaticMeshComponent0`;
          const mobRes = await rcCall(meshComp, "SetMobility", { NewMobility: "Movable" });
          if (mobRes.ok) {
            steps.push("Set mobility: Movable");
          } else {
            steps.push(`Warning: Failed to set mobility (${mobRes.status})`);
          }
          const physRes = await rcCall(meshComp, "SetSimulatePhysics", { bSimulate: true });
          if (physRes.ok) {
            steps.push("Enabled physics simulation");
          } else {
            steps.push(`Warning: Failed to enable physics (${physRes.status})`);
          }
          const gravRes = await rcCall(meshComp, "SetEnableGravity", { bGravityEnabled: true });
          if (gravRes.ok) {
            steps.push("Enabled gravity");
          } else {
            steps.push(`Warning: Failed to enable gravity (${gravRes.status})`);
          }
        }

        // Step 4: Set label
        if (label) {
          const labelRes = await rcCall(actorPath, "SetActorLabel", { NewActorLabel: label });
          if (labelRes.ok) {
            steps.push(`Set label: "${label}"`);
          } else {
            steps.push(`Warning: Failed to set label (${labelRes.status})`);
          }
        }

        // Step 5: Set rotation
        if (rotation) {
          const rotRes = await rcCall(actorPath, "K2_SetActorRotation", {
            NewRotation: { Pitch: rotation.pitch, Yaw: rotation.yaw, Roll: rotation.roll },
            bTeleportPhysics: true,
          });
          if (rotRes.ok) {
            steps.push(`Set rotation: pitch=${rotation.pitch} yaw=${rotation.yaw} roll=${rotation.roll}`);
          } else {
            steps.push(`Warning: Failed to set rotation (${rotRes.status})`);
          }
        }

        // Step 6: Set scale
        if (scale) {
          const scaleRes = await rcCall(actorPath, "SetActorScale3D", {
            NewScale3D: { X: scale.x, Y: scale.y, Z: scale.z },
          });
          if (scaleRes.ok) {
            steps.push(`Set scale: ${scale.x}, ${scale.y}, ${scale.z}`);
          } else {
            steps.push(`Warning: Failed to set scale (${scaleRes.status})`);
          }
        }

        let output = `## Actor Spawned\n\n`;
        output += `- **Path**: \`${actorPath}\`\n`;
        output += steps.map((s) => `- ${s}`).join("\n");
        return textResult(output);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 3. ue5_list_actors — List level actors
  server.registerTool(
    "ue5_list_actors",
    {
      title: "List Actors in UE5 Level",
      description:
        "List all actors in the current level. Optionally filter by class name substring.",
      inputSchema: {
        class_filter: z
          .string()
          .optional()
          .describe("Filter actors by class name substring (e.g., 'StaticMesh', 'Light')"),
        limit: z
          .number()
          .min(1)
          .max(500)
          .default(50)
          .describe("Maximum number of actors to return"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ class_filter, limit }) => {
      try {
        const res = await rcCall(
          "/Script/UnrealEd.Default__EditorActorSubsystem",
          "GetAllLevelActors"
        );

        if (!res.ok) {
          return errorResult(`Failed to list actors (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
        }

        let actors: string[] = res.data?.ReturnValue || [];

        if (class_filter) {
          const filterLower = class_filter.toLowerCase();
          actors = actors.filter((a: string) => a.toLowerCase().includes(filterLower));
        }

        const total = actors.length;
        actors = actors.slice(0, limit);

        let output = `## Level Actors`;
        if (class_filter) output += ` (filter: "${class_filter}")`;
        output += `\n\nShowing ${actors.length} of ${total} actors\n\n`;
        actors.forEach((a, i) => {
          output += `${i + 1}. \`${a}\`\n`;
        });

        return textResult(output);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 4. ue5_delete_actor — Delete actor by path
  server.registerTool(
    "ue5_delete_actor",
    {
      title: "Delete Actor from UE5 Level",
      description: "Delete an actor from the current level by its object path.",
      inputSchema: {
        actor_path: z.string().describe("Full object path of the actor to delete"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ actor_path }) => {
      try {
        const res = await rcCall(
          "/Script/UnrealEd.Default__EditorActorSubsystem",
          "DestroyActor",
          { ActorToDestroy: actor_path }
        );

        if (!res.ok) {
          return errorResult(`Delete failed (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
        }

        return textResult(`Deleted actor: \`${actor_path}\``);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 5. ue5_modify_actor — Modify actor properties
  server.registerTool(
    "ue5_modify_actor",
    {
      title: "Modify Actor in UE5 Level",
      description:
        "Modify an existing actor: change location, rotation, scale, label, or set arbitrary properties.",
      inputSchema: {
        actor_path: z.string().describe("Full object path of the actor"),
        location: LocationSchema,
        rotation: RotationSchema,
        scale: ScaleSchema,
        label: z.string().optional().describe("New display label"),
        properties: z
          .record(z.any())
          .optional()
          .describe("Arbitrary properties to set as {propertyName: value} pairs"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ actor_path, location, rotation, scale, label, properties }) => {
      try {
        const steps: string[] = [];

        if (location) {
          const res = await rcCall(actor_path, "K2_SetActorLocation", {
            NewLocation: { X: location.x, Y: location.y, Z: location.z },
            bSweep: false,
            bTeleport: true,
          });
          steps.push(res.ok
            ? `Location → (${location.x}, ${location.y}, ${location.z})`
            : `Warning: Failed to set location (${res.status})`);
        }

        if (rotation) {
          const res = await rcCall(actor_path, "K2_SetActorRotation", {
            NewRotation: { Pitch: rotation.pitch, Yaw: rotation.yaw, Roll: rotation.roll },
            bTeleportPhysics: true,
          });
          steps.push(res.ok
            ? `Rotation → (${rotation.pitch}, ${rotation.yaw}, ${rotation.roll})`
            : `Warning: Failed to set rotation (${res.status})`);
        }

        if (scale) {
          const res = await rcCall(actor_path, "SetActorScale3D", {
            NewScale3D: { X: scale.x, Y: scale.y, Z: scale.z },
          });
          steps.push(res.ok
            ? `Scale → (${scale.x}, ${scale.y}, ${scale.z})`
            : `Warning: Failed to set scale (${res.status})`);
        }

        if (label) {
          const res = await rcCall(actor_path, "SetActorLabel", { NewActorLabel: label });
          steps.push(res.ok
            ? `Label → "${label}"`
            : `Warning: Failed to set label (${res.status})`);
        }

        if (properties) {
          for (const [propName, propValue] of Object.entries(properties)) {
            const res = await rcProperty(actor_path, propName, propValue);
            steps.push(res.ok
              ? `${propName} → ${JSON.stringify(propValue)}`
              : `Warning: Failed to set ${propName} (${res.status})`);
          }
        }

        if (steps.length === 0) {
          return textResult("No modifications specified.");
        }

        let output = `## Modified \`${actor_path}\`\n\n`;
        output += steps.map((s) => `- ${s}`).join("\n");
        return textResult(output);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 6. ue5_set_material — Set material on mesh component
  server.registerTool(
    "ue5_set_material",
    {
      title: "Set Material on UE5 Actor",
      description:
        "Set a material on an actor's mesh component by material asset path and slot index.",
      inputSchema: {
        actor_path: z.string().describe("Full object path of the actor"),
        material_path: z
          .string()
          .describe("Material asset path (e.g., /Game/Materials/M_Red)"),
        slot_index: z.number().default(0).describe("Material slot index"),
        component_name: z
          .string()
          .default("StaticMeshComponent0")
          .describe("Mesh component name"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ actor_path, material_path, slot_index, component_name }) => {
      try {
        const compPath = `${actor_path}.${component_name}`;
        const res = await rcCall(compPath, "SetMaterial", {
          ElementIndex: slot_index,
          Material: material_path,
        });

        if (!res.ok) {
          return errorResult(`SetMaterial failed (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
        }

        return textResult(
          `Set material on \`${compPath}\` slot ${slot_index} → \`${material_path}\``
        );
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 7. ue5_set_mesh — Change static mesh on an actor
  server.registerTool(
    "ue5_set_mesh",
    {
      title: "Set Static Mesh on UE5 Actor",
      description:
        `Change the static mesh on an actor. Use shorthand (${Object.keys(ENGINE_MESHES).join(", ")}) or a full asset path.`,
      inputSchema: {
        actor_path: z.string().describe("Full object path of the actor"),
        mesh: z
          .string()
          .describe(
            `Mesh shorthand (${Object.keys(ENGINE_MESHES).join(", ")}) or full asset path`
          ),
        component_name: z
          .string()
          .default("StaticMeshComponent0")
          .describe("Mesh component name"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ actor_path, mesh, component_name }) => {
      try {
        const meshPath = ENGINE_MESHES[mesh] || mesh;
        const compPath = `${actor_path}.${component_name}`;
        const res = await rcProperty(compPath, "StaticMesh", meshPath);

        if (!res.ok) {
          return errorResult(`Set mesh failed (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
        }

        return textResult(`Set mesh on \`${compPath}\` → \`${meshPath}\``);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 8. ue5_describe_actor — Full property dump
  server.registerTool(
    "ue5_describe_actor",
    {
      title: "Describe UE5 Actor",
      description:
        "Get a full property dump of an actor via the Remote Control describe endpoint.",
      inputSchema: {
        actor_path: z.string().describe("Full object path of the actor"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ actor_path }) => {
      try {
        const res = await rcFetch("/remote/object/describe", "PUT", {
          objectPath: actor_path,
        });

        if (!res.ok) {
          return errorResult(`Describe failed (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
        }

        const data = res.data;
        let output = `## Actor: \`${actor_path}\`\n\n`;

        if (data.Name) output += `- **Name**: ${data.Name}\n`;
        if (data.Class) output += `- **Class**: ${data.Class}\n`;

        if (data.Properties && Array.isArray(data.Properties)) {
          output += `\n### Properties (${data.Properties.length})\n\n`;
          output += `| Name | Type | Value |\n|------|------|-------|\n`;
          for (const prop of data.Properties.slice(0, 100)) {
            const val =
              typeof prop.Value === "object"
                ? JSON.stringify(prop.Value)
                : String(prop.Value ?? "");
            const truncated = val.length > 80 ? val.slice(0, 77) + "..." : val;
            output += `| ${prop.Name} | ${prop.Type || ""} | ${truncated} |\n`;
          }
          if (data.Properties.length > 100) {
            output += `\n*...and ${data.Properties.length - 100} more properties*\n`;
          }
        }

        if (data.Functions && Array.isArray(data.Functions)) {
          output += `\n### Functions (${data.Functions.length})\n\n`;
          for (const fn of data.Functions.slice(0, 50)) {
            output += `- \`${fn.Name || fn}\`\n`;
          }
          if (data.Functions.length > 50) {
            output += `\n*...and ${data.Functions.length - 50} more functions*\n`;
          }
        }

        return textResult(output);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 9. ue5_search_assets — Search asset registry
  server.registerTool(
    "ue5_search_assets",
    {
      title: "Search UE5 Asset Registry",
      description:
        "Search the UE5 asset registry by name, class, or path using the Remote Control API.",
      inputSchema: {
        query: z.string().describe("Search query string"),
        class_name: z
          .string()
          .optional()
          .describe("Filter by asset class (e.g., StaticMesh, Material, Blueprint)"),
        path: z
          .string()
          .optional()
          .describe("Filter by asset path prefix (e.g., /Game/Meshes)"),
        limit: z.number().min(1).max(200).default(25).describe("Max results"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, class_name, path, limit }) => {
      try {
        const body: any = {
          Query: query,
          Limit: limit,
        };
        if (class_name) body.Filter = { ClassNames: [class_name] };
        if (path) body.Filter = { ...body.Filter, PackagePaths: [path] };

        const res = await rcFetch("/remote/search/assets", "PUT", body);

        if (!res.ok) {
          return errorResult(`Asset search failed (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
        }

        const assets = res.data?.Assets || res.data || [];
        if (!Array.isArray(assets) || assets.length === 0) {
          return textResult(`No assets found matching "${query}".`);
        }

        let output = `## Asset Search: "${query}"\n\n`;
        output += `Found ${assets.length} assets\n\n`;
        for (const asset of assets.slice(0, limit)) {
          if (typeof asset === "string") {
            output += `- \`${asset}\`\n`;
          } else {
            output += `- \`${asset.AssetPath || asset.ObjectPath || asset.Name || JSON.stringify(asset)}\``;
            if (asset.ClassName) output += ` (${asset.ClassName})`;
            output += "\n";
          }
        }

        return textResult(output);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 10. ue5_editor_command — Dispatch table for common editor actions
  const EDITOR_COMMANDS: Record<
    string,
    { objectPath: string; functionName: string; parameters?: Record<string, any>; description: string }
  > = {
    play: {
      objectPath: "/Script/UnrealEd.Default__UnrealEditorSubsystem",
      functionName: "StartPIE",
      parameters: { bSimulateInEditor: false },
      description: "Start Play In Editor (PIE)",
    },
    simulate: {
      objectPath: "/Script/UnrealEd.Default__UnrealEditorSubsystem",
      functionName: "StartPIE",
      parameters: { bSimulateInEditor: true },
      description: "Start Simulate In Editor",
    },
    stop: {
      objectPath: "/Script/UnrealEd.Default__UnrealEditorSubsystem",
      functionName: "EndPIE",
      description: "Stop Play In Editor",
    },
    save_current_level: {
      objectPath: "/Script/UnrealEd.Default__EditorLoadingAndSavingUtils",
      functionName: "SaveCurrentLevel",
      description: "Save the current level",
    },
    save_all: {
      objectPath: "/Script/UnrealEd.Default__EditorLoadingAndSavingUtils",
      functionName: "SaveDirtyPackages",
      parameters: { bPromptUserToSave: false, bSaveMapPackages: true, bSaveContentPackages: true },
      description: "Save all dirty packages",
    },
    undo: {
      objectPath: "/Script/UnrealEd.Default__UnrealEditorSubsystem",
      functionName: "Undo",
      description: "Undo the last action",
    },
    redo: {
      objectPath: "/Script/UnrealEd.Default__UnrealEditorSubsystem",
      functionName: "Redo",
      description: "Redo the last undone action",
    },
    select_none: {
      objectPath: "/Script/UnrealEd.Default__EditorActorSubsystem",
      functionName: "ClearActorSelectionSet",
      description: "Deselect all actors",
    },
    delete_selected: {
      objectPath: "/Script/UnrealEd.Default__EditorActorSubsystem",
      functionName: "DestroySelectedActors",
      description: "Delete all selected actors",
    },
    duplicate_selected: {
      objectPath: "/Script/UnrealEd.Default__EditorActorSubsystem",
      functionName: "DuplicateSelectedActors",
      description: "Duplicate all selected actors",
    },
  };

  server.registerTool(
    "ue5_editor_command",
    {
      title: "Run UE5 Editor Command",
      description:
        `Execute a common editor command: ${Object.keys(EDITOR_COMMANDS).join(", ")}`,
      inputSchema: {
        command: z
          .enum(Object.keys(EDITOR_COMMANDS) as [string, ...string[]])
          .describe("Editor command to execute"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ command }) => {
      try {
        const cmd = EDITOR_COMMANDS[command];
        if (!cmd) {
          return errorResult(`Unknown command: ${command}`);
        }

        const res = await rcCall(cmd.objectPath, cmd.functionName, cmd.parameters);

        if (!res.ok) {
          return errorResult(
            `Command "${command}" failed (HTTP ${res.status}): ${JSON.stringify(res.data)}`
          );
        }

        return textResult(`Executed: **${cmd.description}**`);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 11. ue5_batch — Multiple operations in one call
  server.registerTool(
    "ue5_batch",
    {
      title: "Batch UE5 Remote Control Operations",
      description:
        "Execute multiple Remote Control operations in a single HTTP batch request. Each operation can be a function call or property set.",
      inputSchema: {
        operations: z
          .array(
            z.object({
              type: z
                .enum(["call", "property"])
                .describe("Operation type: 'call' for function calls, 'property' for property sets"),
              object_path: z.string().describe("Target object path"),
              function_name: z
                .string()
                .optional()
                .describe("Function name (required for 'call' type)"),
              property_name: z
                .string()
                .optional()
                .describe("Property name (required for 'property' type)"),
              parameters: z
                .record(z.any())
                .optional()
                .describe("Function parameters (for 'call' type)"),
              property_value: z
                .any()
                .optional()
                .describe("Property value (for 'property' type)"),
            })
          )
          .min(1)
          .max(50)
          .describe("Array of operations to execute"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ operations }) => {
      try {
        const requests = operations.map((op, index) => {
          if (op.type === "call") {
            return {
              RequestId: index,
              URL: "/remote/object/call",
              Verb: "PUT",
              Body: {
                objectPath: op.object_path,
                functionName: op.function_name,
                parameters: op.parameters || {},
                generateTransaction: true,
              },
            };
          } else {
            return {
              RequestId: index,
              URL: "/remote/object/property",
              Verb: "PUT",
              Body: {
                objectPath: op.object_path,
                propertyName: op.property_name,
                propertyValue: op.property_value,
              },
            };
          }
        });

        const res = await rcFetch("/remote/batch", "PUT", { Requests: requests });

        if (!res.ok) {
          return errorResult(`Batch request failed (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
        }

        const responses = res.data?.Responses || res.data || [];
        let output = `## Batch Results (${operations.length} operations)\n\n`;

        for (let i = 0; i < operations.length; i++) {
          const op = operations[i];
          const resp = Array.isArray(responses)
            ? responses.find((r: any) => r.RequestId === i) || responses[i]
            : undefined;

          const status = resp?.StatusCode || resp?.status || "?";
          const ok = status >= 200 && status < 300;
          const icon = ok ? "OK" : "FAIL";

          output += `${i + 1}. [${icon}] `;
          if (op.type === "call") {
            output += `call \`${op.object_path}\`.${op.function_name}()`;
          } else {
            output += `set \`${op.object_path}\`.${op.property_name}`;
          }
          output += ` — ${status}\n`;
        }

        return textResult(output);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 12. ue5_console_command — Execute arbitrary console commands
  server.registerTool(
    "ue5_console_command",
    {
      title: "Execute UE5 Console Command",
      description:
        "Execute an arbitrary Unreal Engine console command. Useful for CVars (r.ShadowQuality, r.DynamicGlobalIlluminationMethod, sg.ShadowQuality), rendering settings, performance tuning, and any command you'd type in the ~ console.",
      inputSchema: {
        command: z.string().describe("Console command to execute (e.g., 'stat fps', 'r.ShadowQuality 3', 'highresshot 1920x1080')"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ command }) => {
      try {
        // KismetSystemLibrary::ExecuteConsoleCommand via the editor world
        const res = await rcCall(
          "/Script/Engine.Default__KismetSystemLibrary",
          "ExecuteConsoleCommand",
          {
            WorldContextObject: "/Script/UnrealEd.Default__EditorActorSubsystem",
            Command: command,
          }
        );

        if (!res.ok) {
          return errorResult(`Console command failed (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
        }

        return textResult(`Executed console command: \`${command}\``);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 13. ue5_set_camera — Set viewport camera position and rotation
  server.registerTool(
    "ue5_set_camera",
    {
      title: "Set UE5 Viewport Camera",
      description:
        "Set the editor viewport camera location and/or rotation. Useful for framing scenes, setting up overview angles, or jumping to specific positions.",
      inputSchema: {
        location: LocationSchema,
        rotation: RotationSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ location, rotation }) => {
      try {
        const params: Record<string, any> = {};
        if (location) {
          params.CameraLocation = { X: location.x, Y: location.y, Z: location.z };
        }
        if (rotation) {
          params.CameraRotation = { Pitch: rotation.pitch, Yaw: rotation.yaw, Roll: rotation.roll };
        }

        if (!location && !rotation) {
          return errorResult("Specify at least location or rotation.");
        }

        // If only one is provided, get the other from current state
        if (!location || !rotation) {
          const getRes = await rcCall(
            "/Script/UnrealEd.Default__UnrealEditorSubsystem",
            "GetLevelViewportCameraInfo",
            {}
          );
          if (getRes.ok && getRes.data) {
            if (!location && getRes.data.CameraLocation) {
              params.CameraLocation = getRes.data.CameraLocation;
            }
            if (!rotation && getRes.data.CameraRotation) {
              params.CameraRotation = getRes.data.CameraRotation;
            }
          }
        }

        const res = await rcCall(
          "/Script/UnrealEd.Default__UnrealEditorSubsystem",
          "SetLevelViewportCameraInfo",
          params
        );

        if (!res.ok) {
          return errorResult(`Set camera failed (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
        }

        let output = "## Camera Updated\n\n";
        if (location) output += `- **Location**: (${location.x}, ${location.y}, ${location.z})\n`;
        if (rotation) output += `- **Rotation**: pitch=${rotation.pitch} yaw=${rotation.yaw} roll=${rotation.roll}\n`;
        return textResult(output);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 14. ue5_get_camera — Get current viewport camera
  server.registerTool(
    "ue5_get_camera",
    {
      title: "Get UE5 Viewport Camera",
      description: "Get the current editor viewport camera location and rotation.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const res = await rcCall(
          "/Script/UnrealEd.Default__UnrealEditorSubsystem",
          "GetLevelViewportCameraInfo",
          {}
        );

        if (!res.ok) {
          return errorResult(`Get camera failed (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
        }

        const loc = res.data?.CameraLocation || {};
        const rot = res.data?.CameraRotation || {};

        let output = "## Current Viewport Camera\n\n";
        output += `- **Location**: X=${loc.X ?? 0} Y=${loc.Y ?? 0} Z=${loc.Z ?? 0}\n`;
        output += `- **Rotation**: Pitch=${rot.Pitch ?? 0} Yaw=${rot.Yaw ?? 0} Roll=${rot.Roll ?? 0}\n`;
        return textResult(output);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 15. ue5_spawn_light — Spawn typed lights with parameters
  const LIGHT_CLASSES: Record<string, string> = {
    PointLight: "/Script/Engine.PointLight",
    SpotLight: "/Script/Engine.SpotLight",
    DirectionalLight: "/Script/Engine.DirectionalLight",
    RectLight: "/Script/Engine.RectLight",
    SkyLight: "/Script/Engine.SkyLight",
  };

  server.registerTool(
    "ue5_spawn_light",
    {
      title: "Spawn Light in UE5 Editor",
      description:
        `Spawn a light actor (${Object.keys(LIGHT_CLASSES).join(", ")}) with intensity, color, attenuation radius, and optional cone angles for spot lights.`,
      inputSchema: {
        light_type: z
          .enum(Object.keys(LIGHT_CLASSES) as [string, ...string[]])
          .describe("Type of light to spawn"),
        location: LocationSchema,
        rotation: RotationSchema,
        label: z.string().optional().describe("Display label for the light"),
        intensity: z.number().default(5000).describe("Light intensity (candelas for point/spot, lux for directional)"),
        color: z
          .object({
            r: z.number().min(0).max(255).default(255),
            g: z.number().min(0).max(255).default(255),
            b: z.number().min(0).max(255).default(255),
          })
          .optional()
          .describe("Light color RGB (0-255)"),
        attenuation_radius: z.number().optional().describe("Attenuation radius (point/spot lights)"),
        inner_cone_angle: z.number().optional().describe("Inner cone angle in degrees (spot lights only)"),
        outer_cone_angle: z.number().optional().describe("Outer cone angle in degrees (spot lights only)"),
        cast_shadows: z.boolean().default(true).describe("Whether the light casts shadows"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ light_type, location, rotation, label, intensity, color, attenuation_radius, inner_cone_angle, outer_cone_angle, cast_shadows }) => {
      try {
        const classPath = LIGHT_CLASSES[light_type];
        const loc = location || { x: 0, y: 0, z: 300 };

        // Spawn the light
        const spawnRes = await rcCall(
          "/Script/UnrealEd.Default__EditorActorSubsystem",
          "SpawnActorFromClass",
          {
            ActorClass: classPath,
            Location: { X: loc.x, Y: loc.y, Z: loc.z },
          }
        );

        if (!spawnRes.ok) {
          return errorResult(`Spawn light failed (HTTP ${spawnRes.status}): ${JSON.stringify(spawnRes.data)}`);
        }

        const actorPath = spawnRes.data?.ReturnValue;
        if (!actorPath) {
          return errorResult(`Spawn returned no actor path.`);
        }

        const steps: string[] = [`Spawned ${light_type} → \`${actorPath}\``];

        // Find the light component (it's always LightComponent0)
        const lightComp = `${actorPath}.LightComponent0`;

        // Set intensity
        const intRes = await rcCall(lightComp, "SetIntensity", { NewIntensity: intensity });
        if (intRes.ok) {
          steps.push(`Intensity: ${intensity}`);
        }

        // Set color
        if (color) {
          const colRes = await rcCall(lightComp, "SetLightColor", {
            NewLightColor: { R: color.r, G: color.g, B: color.b, A: 255 },
          });
          if (colRes.ok) {
            steps.push(`Color: (${color.r}, ${color.g}, ${color.b})`);
          }
        }

        // Set attenuation radius (point/spot/rect)
        if (attenuation_radius && light_type !== "DirectionalLight" && light_type !== "SkyLight") {
          const attRes = await rcCall(lightComp, "SetAttenuationRadius", { NewRadius: attenuation_radius });
          if (attRes.ok) {
            steps.push(`Attenuation radius: ${attenuation_radius}`);
          }
        }

        // Spot light cone angles
        if (light_type === "SpotLight") {
          if (inner_cone_angle !== undefined) {
            await rcCall(lightComp, "SetInnerConeAngle", { NewInnerConeAngle: inner_cone_angle });
            steps.push(`Inner cone: ${inner_cone_angle}°`);
          }
          if (outer_cone_angle !== undefined) {
            await rcCall(lightComp, "SetOuterConeAngle", { NewOuterConeAngle: outer_cone_angle });
            steps.push(`Outer cone: ${outer_cone_angle}°`);
          }
        }

        // Cast shadows
        const shadowRes = await rcCall(lightComp, "SetCastShadows", { NewCastShadows: cast_shadows });
        if (shadowRes.ok) {
          steps.push(`Cast shadows: ${cast_shadows}`);
        }

        // Set rotation
        if (rotation) {
          await rcCall(actorPath, "K2_SetActorRotation", {
            NewRotation: { Pitch: rotation.pitch, Yaw: rotation.yaw, Roll: rotation.roll },
            bTeleportPhysics: true,
          });
          steps.push(`Rotation: pitch=${rotation.pitch} yaw=${rotation.yaw} roll=${rotation.roll}`);
        }

        // Set label
        if (label) {
          await rcCall(actorPath, "SetActorLabel", { NewActorLabel: label });
          steps.push(`Label: "${label}"`);
        }

        let output = `## Light Spawned\n\n`;
        output += `- **Path**: \`${actorPath}\`\n`;
        output += steps.map((s) => `- ${s}`).join("\n");
        return textResult(output);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 16. ue5_apply_force — Apply force/impulse to physics actors
  server.registerTool(
    "ue5_apply_force",
    {
      title: "Apply Force or Impulse to UE5 Actor",
      description:
        "Apply a physics force, impulse, or torque to an actor's mesh component. The actor must have physics simulation enabled.",
      inputSchema: {
        actor_path: z.string().describe("Full object path of the actor"),
        mode: z
          .enum(["force", "impulse", "velocity", "torque"])
          .describe("force: continuous acceleration, impulse: instant kick, velocity: set directly, torque: rotational force"),
        value: z.object({
          x: z.number().default(0),
          y: z.number().default(0),
          z: z.number().default(0),
        }).describe("Force/impulse/velocity/torque vector"),
        component_name: z
          .string()
          .default("StaticMeshComponent0")
          .describe("Physics component name"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ actor_path, mode, value, component_name }) => {
      try {
        const compPath = `${actor_path}.${component_name}`;
        const vec = { X: value.x, Y: value.y, Z: value.z };

        let functionName: string;
        let parameters: Record<string, any>;

        switch (mode) {
          case "force":
            functionName = "AddForce";
            parameters = { Force: vec };
            break;
          case "impulse":
            functionName = "AddImpulse";
            parameters = { Impulse: vec };
            break;
          case "velocity":
            functionName = "SetPhysicsLinearVelocity";
            parameters = { NewVel: vec };
            break;
          case "torque":
            functionName = "AddTorqueInDegrees";
            parameters = { Torque: vec };
            break;
        }

        const res = await rcCall(compPath, functionName, parameters);

        if (!res.ok) {
          return errorResult(`${mode} failed (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
        }

        return textResult(
          `Applied ${mode} to \`${compPath}\`: (${value.x}, ${value.y}, ${value.z})`
        );
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );

  // 17. ue5_create_dynamic_material — Create and configure dynamic material instance
  server.registerTool(
    "ue5_create_dynamic_material",
    {
      title: "Create Dynamic Material on UE5 Actor",
      description:
        "Create a dynamic material instance on an actor's mesh component and set scalar/vector parameters. Useful for runtime material changes like metallic, roughness, base color, emissive.",
      inputSchema: {
        actor_path: z.string().describe("Full object path of the actor"),
        slot_index: z.number().default(0).describe("Material slot index"),
        component_name: z
          .string()
          .default("StaticMeshComponent0")
          .describe("Mesh component name"),
        scalar_params: z
          .record(z.number())
          .optional()
          .describe("Scalar parameters as {name: value} (e.g., {Metallic: 1.0, Roughness: 0.2})"),
        vector_params: z
          .record(
            z.object({
              r: z.number(), g: z.number(), b: z.number(), a: z.number().default(1),
            })
          )
          .optional()
          .describe("Vector/color parameters as {name: {r, g, b, a}} (e.g., {BaseColor: {r: 1, g: 0.8, b: 0.3, a: 1}})"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ actor_path, slot_index, component_name, scalar_params, vector_params }) => {
      try {
        const compPath = `${actor_path}.${component_name}`;

        // Create the dynamic material instance
        const createRes = await rcCall(compPath, "CreateDynamicMaterialInstance", {
          ElementIndex: slot_index,
        });

        if (!createRes.ok) {
          return errorResult(
            `CreateDynamicMaterialInstance failed (HTTP ${createRes.status}): ${JSON.stringify(createRes.data)}`
          );
        }

        const matPath = createRes.data?.ReturnValue;
        if (!matPath) {
          return errorResult("No material instance path returned.");
        }

        const steps: string[] = [`Created dynamic material: \`${matPath}\``];

        // Set scalar parameters
        if (scalar_params) {
          for (const [name, value] of Object.entries(scalar_params)) {
            const res = await rcCall(matPath, "SetScalarParameterValue", {
              ParameterName: name,
              Value: value,
            });
            steps.push(res.ok ? `${name} = ${value}` : `Warning: ${name} failed (${res.status})`);
          }
        }

        // Set vector parameters
        if (vector_params) {
          for (const [name, value] of Object.entries(vector_params)) {
            const res = await rcCall(matPath, "SetVectorParameterValue", {
              ParameterName: name,
              Value: { R: value.r, G: value.g, B: value.b, A: value.a },
            });
            steps.push(res.ok
              ? `${name} = (${value.r}, ${value.g}, ${value.b}, ${value.a})`
              : `Warning: ${name} failed (${res.status})`);
          }
        }

        let output = `## Dynamic Material Created\n\n`;
        output += `- **Actor**: \`${actor_path}\`\n`;
        output += `- **Material**: \`${matPath}\`\n`;
        output += steps.map((s) => `- ${s}`).join("\n");
        return textResult(output);
      } catch (err: any) {
        return errorResult(err.message);
      }
    }
  );
}
