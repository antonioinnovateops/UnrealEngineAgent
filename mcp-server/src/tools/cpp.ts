import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerCppTools(server: McpServer) {
  server.registerTool(
    "ue5_generate_class",
    {
      title: "Generate UE5 C++ Class",
      description:
        "Generate a complete UE5 C++ header and source file pair with proper boilerplate, macros, and Epic coding standard compliance.",
      inputSchema: {
        class_name: z
          .string()
          .describe("Class name without prefix (e.g., 'PlayerCharacter', 'HealthComponent')"),
        class_type: z
          .enum([
            "Actor",
            "Character",
            "ActorComponent",
            "SceneComponent",
            "GameplayAbility",
            "AttributeSet",
            "GameMode",
            "PlayerController",
            "PlayerState",
            "GameState",
            "Subsystem",
            "Interface",
            "DataAsset",
            "UserWidget",
            "Object",
          ])
          .describe("UE5 class type"),
        module_name: z
          .string()
          .describe("Module name for API macro (e.g., 'MyProject')"),
        subsystem_type: z
          .enum(["GameInstance", "World", "LocalPlayer"])
          .optional()
          .describe("Subsystem lifetime (only for Subsystem class_type)"),
        include_tick: z
          .boolean()
          .default(false)
          .describe("Include Tick/TickComponent override"),
        include_replication: z
          .boolean()
          .default(false)
          .describe("Include GetLifetimeReplicatedProps and sample replicated property"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({
      class_name,
      class_type,
      module_name,
      subsystem_type,
      include_tick,
      include_replication,
    }) => {
      const apiMacro = `${module_name.toUpperCase()}_API`;

      // Determine prefix and parent
      const typeConfig: Record<
        string,
        { prefix: string; parent: string; headerInclude: string }
      > = {
        Actor: {
          prefix: "A",
          parent: "AActor",
          headerInclude: "GameFramework/Actor.h",
        },
        Character: {
          prefix: "A",
          parent: "ACharacter",
          headerInclude: "GameFramework/Character.h",
        },
        ActorComponent: {
          prefix: "U",
          parent: "UActorComponent",
          headerInclude: "Components/ActorComponent.h",
        },
        SceneComponent: {
          prefix: "U",
          parent: "USceneComponent",
          headerInclude: "Components/SceneComponent.h",
        },
        GameplayAbility: {
          prefix: "U",
          parent: "UGameplayAbility",
          headerInclude: "Abilities/GameplayAbility.h",
        },
        AttributeSet: {
          prefix: "U",
          parent: "UAttributeSet",
          headerInclude: "AttributeSet.h",
        },
        GameMode: {
          prefix: "A",
          parent: "AGameModeBase",
          headerInclude: "GameFramework/GameModeBase.h",
        },
        PlayerController: {
          prefix: "A",
          parent: "APlayerController",
          headerInclude: "GameFramework/PlayerController.h",
        },
        PlayerState: {
          prefix: "A",
          parent: "APlayerState",
          headerInclude: "GameFramework/PlayerState.h",
        },
        GameState: {
          prefix: "A",
          parent: "AGameStateBase",
          headerInclude: "GameFramework/GameStateBase.h",
        },
        Subsystem: {
          prefix: "U",
          parent: `U${subsystem_type || "GameInstance"}Subsystem`,
          headerInclude: `Subsystems/${subsystem_type || "GameInstance"}Subsystem.h`,
        },
        Interface: {
          prefix: "I",
          parent: "UInterface",
          headerInclude: "UObject/Interface.h",
        },
        DataAsset: {
          prefix: "U",
          parent: "UPrimaryDataAsset",
          headerInclude: "Engine/DataAsset.h",
        },
        UserWidget: {
          prefix: "U",
          parent: "UUserWidget",
          headerInclude: "Blueprint/UserWidget.h",
        },
        Object: {
          prefix: "U",
          parent: "UObject",
          headerInclude: "UObject/Object.h",
        },
      };

      const config = typeConfig[class_type];
      const fullClassName = `${config.prefix}${class_name}`;
      const fileName = class_name;

      // Build header
      let header = `#pragma once

#include "CoreMinimal.h"
#include "${config.headerInclude}"`;

      if (include_replication) {
        header += `\n#include "Net/UnrealNetwork.h"`;
      }

      header += `\n#include "${fileName}.generated.h"\n\n`;

      // Special handling for Interface
      if (class_type === "Interface") {
        header += `UINTERFACE(MinimalAPI, Blueprintable)
class U${class_name} : public UInterface
{
\tGENERATED_BODY()
};

class ${apiMacro} I${class_name}
{
\tGENERATED_BODY()

public:
\tUFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "${class_name}")
\tvoid Execute(AActor* Caller);
};\n`;
      } else {
        // Class declaration
        const classSpecifiers =
          class_type === "ActorComponent" || class_type === "SceneComponent"
            ? `(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))`
            : class_type === "DataAsset"
              ? `(BlueprintType)`
              : `()`;

        header += `UCLASS${classSpecifiers}\nclass ${apiMacro} ${fullClassName} : public ${config.parent}\n{\n\tGENERATED_BODY()\n\npublic:\n\t${fullClassName}();\n`;

        // Lifecycle overrides
        if (
          ["Actor", "Character", "ActorComponent", "SceneComponent", "UserWidget"].includes(
            class_type
          )
        ) {
          header += `\nprotected:\n\tvirtual void BeginPlay() override;\n`;
        }

        if (include_tick) {
          if (
            class_type === "ActorComponent" ||
            class_type === "SceneComponent"
          ) {
            header += `\tvirtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;\n`;
          } else if (
            ["Actor", "Character"].includes(class_type)
          ) {
            header += `\tvirtual void Tick(float DeltaTime) override;\n`;
          }
        }

        if (include_replication) {
          header += `\npublic:\n\tvirtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;\n`;
          header += `\nprotected:\n\tUPROPERTY(ReplicatedUsing = OnRep_ExampleValue)\n\tfloat ExampleValue = 0.0f;\n\n\tUFUNCTION()\n\tvoid OnRep_ExampleValue();\n`;
        }

        // Subsystem overrides
        if (class_type === "Subsystem") {
          header += `\npublic:\n\tvirtual void Initialize(FSubsystemCollectionBase& Collection) override;\n\tvirtual void Deinitialize() override;\n`;
        }

        // GameMode overrides
        if (class_type === "GameMode") {
          header += `\npublic:\n\tvirtual void InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage) override;\n`;
        }

        // Character extras
        if (class_type === "Character") {
          header += `\nprotected:\n\tvirtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;\n`;
        }

        // PlayerController extras
        if (class_type === "PlayerController") {
          header += `\nprotected:\n\tvirtual void SetupInputComponent() override;\n`;
        }

        header += `};\n`;
      }

      // Build source file
      let source = `#include "${fileName}.h"\n`;

      if (include_replication) {
        source += `#include "Net/UnrealNetwork.h"\n`;
      }

      source += `\n`;

      if (class_type !== "Interface") {
        // Constructor
        source += `${fullClassName}::${fullClassName}()\n{\n`;
        if (include_tick && ["Actor", "Character"].includes(class_type)) {
          source += `\tPrimaryActorTick.bCanEverTick = true;\n`;
        } else if (
          include_tick &&
          (class_type === "ActorComponent" || class_type === "SceneComponent")
        ) {
          source += `\tPrimaryComponentTick.bCanEverTick = true;\n`;
        }
        if (include_replication && ["Actor", "Character"].includes(class_type)) {
          source += `\tbReplicates = true;\n`;
        }
        source += `}\n\n`;

        // BeginPlay
        if (
          ["Actor", "Character", "ActorComponent", "SceneComponent", "UserWidget"].includes(
            class_type
          )
        ) {
          source += `void ${fullClassName}::BeginPlay()\n{\n\tSuper::BeginPlay();\n}\n\n`;
        }

        // Tick
        if (include_tick) {
          if (
            class_type === "ActorComponent" ||
            class_type === "SceneComponent"
          ) {
            source += `void ${fullClassName}::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)\n{\n\tSuper::TickComponent(DeltaTime, TickType, ThisTickFunction);\n}\n\n`;
          } else if (
            ["Actor", "Character"].includes(class_type)
          ) {
            source += `void ${fullClassName}::Tick(float DeltaTime)\n{\n\tSuper::Tick(DeltaTime);\n}\n\n`;
          }
        }

        // Replication
        if (include_replication) {
          source += `void ${fullClassName}::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const\n{\n\tSuper::GetLifetimeReplicatedProps(OutLifetimeProps);\n\tDOREPLIFETIME(${fullClassName}, ExampleValue);\n}\n\n`;
          source += `void ${fullClassName}::OnRep_ExampleValue()\n{\n\t// Handle replication update\n}\n\n`;
        }

        // Subsystem
        if (class_type === "Subsystem") {
          source += `void ${fullClassName}::Initialize(FSubsystemCollectionBase& Collection)\n{\n\tSuper::Initialize(Collection);\n}\n\n`;
          source += `void ${fullClassName}::Deinitialize()\n{\n\tSuper::Deinitialize();\n}\n\n`;
        }

        // GameMode
        if (class_type === "GameMode") {
          source += `void ${fullClassName}::InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage)\n{\n\tSuper::InitGame(MapName, Options, ErrorMessage);\n}\n\n`;
        }

        // Character
        if (class_type === "Character") {
          source += `void ${fullClassName}::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)\n{\n\tSuper::SetupPlayerInputComponent(PlayerInputComponent);\n}\n\n`;
        }

        // PlayerController
        if (class_type === "PlayerController") {
          source += `void ${fullClassName}::SetupInputComponent()\n{\n\tSuper::SetupInputComponent();\n}\n\n`;
        }
      }

      const output = `## Generated UE5 C++ Class: ${fullClassName}

### ${fileName}.h
\`\`\`cpp
${header}\`\`\`

### ${fileName}.cpp
\`\`\`cpp
${source.trimEnd()}
\`\`\`

### File Placement
- Header: \`Source/${module_name}/Public/${fileName}.h\`
- Source: \`Source/${module_name}/Private/${fileName}.cpp\`
`;

      return {
        content: [{ type: "text", text: output }],
      };
    }
  );

  server.registerTool(
    "ue5_macro_reference",
    {
      title: "UE5 Macro Reference",
      description:
        "Look up UE5 C++ macro syntax and usage — UPROPERTY, UFUNCTION, UCLASS, USTRUCT, UENUM, and their specifiers.",
      inputSchema: {
        macro: z
          .enum(["UPROPERTY", "UFUNCTION", "UCLASS", "USTRUCT", "UENUM", "UINTERFACE"])
          .describe("The macro to look up"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ macro }) => {
      const references: Record<string, string> = {
        UPROPERTY: `## UPROPERTY Specifiers

### Visibility
- \`EditAnywhere\` — Editable in Details panel on instances and defaults
- \`EditDefaultsOnly\` — Editable only on class defaults (not instances)
- \`EditInstanceOnly\` — Editable only on placed instances
- \`VisibleAnywhere\` — Visible but not editable in Details panel
- \`VisibleDefaultsOnly\` — Visible only on class defaults
- \`VisibleInstanceOnly\` — Visible only on placed instances

### Blueprint Access
- \`BlueprintReadOnly\` — Readable in Blueprints
- \`BlueprintReadWrite\` — Readable and writable in Blueprints

### Replication
- \`Replicated\` — Replicated to clients
- \`ReplicatedUsing = OnRep_FuncName\` — Replicated with notification function
- \`NotReplicated\` — Excluded from replication

### Other
- \`Category = "CategoryName"\` — Groups in Details panel (required for BP access)
- \`meta = (AllowPrivateAccess = "true")\` — Allow BP access to private members
- \`Transient\` — Not serialized (reset on load)
- \`SaveGame\` — Included in save game serialization
- \`Config\` — Loaded from config files
- \`Interp\` — Editable in Sequencer

### Examples
\`\`\`cpp
UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Combat")
float BaseDamage = 10.0f;

UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
TObjectPtr<UStaticMeshComponent> MeshComp;

UPROPERTY(ReplicatedUsing = OnRep_Health)
float Health;

UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Config",
    meta = (AllowPrivateAccess = "true"))
TSubclassOf<UGameplayAbility> DefaultAbility;
\`\`\``,

        UFUNCTION: `## UFUNCTION Specifiers

### Blueprint Access
- \`BlueprintCallable\` — Can be called from Blueprint graphs
- \`BlueprintPure\` — Pure function (no execution pin, no side effects)
- \`BlueprintImplementableEvent\` — Defined in C++, implemented in Blueprint
- \`BlueprintNativeEvent\` — Default C++ implementation, overridable in Blueprint

### Networking
- \`Server\` — Runs on server (RPC)
- \`Client\` — Runs on owning client (RPC)
- \`NetMulticast\` — Runs on all (server + all clients)
- \`Reliable\` — Guaranteed delivery (use sparingly)
- \`Unreliable\` — Best effort (use for frequent updates)
- \`WithValidation\` — Adds validation function (required for Server RPCs in Shipping)

### Other
- \`Category = "CategoryName"\` — Required for BP-exposed functions
- \`Exec\` — Console command callable
- \`CallInEditor\` — Button appears in Details panel

### Examples
\`\`\`cpp
UFUNCTION(BlueprintCallable, Category = "Combat")
void ApplyDamage(AActor* Target, float Amount);

UFUNCTION(BlueprintPure, Category = "Stats")
float GetHealthPercent() const;

UFUNCTION(BlueprintImplementableEvent, Category = "Events")
void OnDeath();

UFUNCTION(BlueprintNativeEvent, Category = "Events")
void OnHit(const FHitResult& Hit);
// Implement as: void AMyActor::OnHit_Implementation(const FHitResult& Hit)

UFUNCTION(Server, Reliable, WithValidation)
void ServerFireWeapon(FVector Origin, FVector Direction);
// Implement: void AMyActor::ServerFireWeapon_Implementation(...)
// Validate: bool AMyActor::ServerFireWeapon_Validate(...)
\`\`\``,

        UCLASS: `## UCLASS Specifiers

### Common
- \`Blueprintable\` — Can be base class for Blueprint
- \`BlueprintType\` — Can be used as variable type in Blueprint
- \`Abstract\` — Cannot be instantiated (base class only)
- \`NotBlueprintable\` — Cannot be subclassed in Blueprint
- \`Transient\` — Not saved to disk

### Spawning
- \`ClassGroup = (Custom)\` — Groups in editor class picker
- \`meta = (BlueprintSpawnableComponent)\` — Component can be added via Blueprint
- \`HideCategories = (CategoryName)\` — Hide property categories in Details
- \`ShowCategories = (CategoryName)\` — Show hidden categories

### Examples
\`\`\`cpp
UCLASS()
class MYPROJECT_API AMyActor : public AActor { ... };

UCLASS(BlueprintType, Blueprintable)
class MYPROJECT_API UMyObject : public UObject { ... };

UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class MYPROJECT_API UMyComponent : public UActorComponent { ... };

UCLASS(Abstract, Blueprintable)
class MYPROJECT_API ABaseWeapon : public AActor { ... };
\`\`\``,

        USTRUCT: `## USTRUCT Specifiers

### Common
- \`BlueprintType\` — Usable as Blueprint variable
- \`Atomic\` — Always serialized as a single unit

### Examples
\`\`\`cpp
USTRUCT(BlueprintType)
struct FDamageInfo
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Amount = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    TObjectPtr<AActor> Instigator = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FGameplayTag DamageType;
};
\`\`\``,

        UENUM: `## UENUM Specifiers

### Common
- \`BlueprintType\` — Usable in Blueprints

### Examples
\`\`\`cpp
UENUM(BlueprintType)
enum class EWeaponType : uint8
{
    None        UMETA(DisplayName = "None"),
    Melee       UMETA(DisplayName = "Melee"),
    Ranged      UMETA(DisplayName = "Ranged"),
    Magic       UMETA(DisplayName = "Magic"),
};

// Usage:
UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Weapon")
EWeaponType WeaponType = EWeaponType::None;
\`\`\``,

        UINTERFACE: `## UINTERFACE Specifiers

### Common
- \`MinimalAPI\` — Minimal export (recommended)
- \`Blueprintable\` — Can be implemented in Blueprint
- \`BlueprintType\` — Can be used as variable type

### Examples
\`\`\`cpp
UINTERFACE(MinimalAPI, Blueprintable)
class UDamageable : public UInterface
{
    GENERATED_BODY()
};

class MYPROJECT_API IDamageable
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Damage")
    float TakeDamage(float Amount, AActor* Instigator);

    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Damage")
    bool IsDead() const;
};

// Implementation in an Actor:
class AMyCharacter : public ACharacter, public IDamageable
{
    // Override:
    virtual float TakeDamage_Implementation(float Amount, AActor* Instigator) override;
    virtual bool IsDead_Implementation() const override;
};
\`\`\``,
      };

      return {
        content: [{ type: "text", text: references[macro] }],
      };
    }
  );
}
