// UE5 core class reference data — commonly used classes with descriptions and module info
// This provides fast offline lookup without hitting the network

export interface UE5ClassInfo {
  name: string;
  module: string;
  parent: string;
  description: string;
  headerPath: string;
  category: string;
  commonMacros?: string[];
}

export const UE5_CLASSES: UE5ClassInfo[] = [
  // Core Gameplay Framework
  {
    name: "AActor",
    module: "Engine",
    parent: "UObject",
    description: "Base class for all actors placed in levels. Has transform, components, replication, and lifecycle.",
    headerPath: "GameFramework/Actor.h",
    category: "Framework",
  },
  {
    name: "APawn",
    module: "Engine",
    parent: "AActor",
    description: "Base class for all possessable actors. Can be possessed by Controllers.",
    headerPath: "GameFramework/Pawn.h",
    category: "Framework",
  },
  {
    name: "ACharacter",
    module: "Engine",
    parent: "APawn",
    description: "Pawn with mesh, capsule, and CharacterMovementComponent. Standard player/NPC base.",
    headerPath: "GameFramework/Character.h",
    category: "Framework",
  },
  {
    name: "APlayerController",
    module: "Engine",
    parent: "AController",
    description: "Controller for human players. Handles input, camera, HUD, and possessing Pawns.",
    headerPath: "GameFramework/PlayerController.h",
    category: "Framework",
  },
  {
    name: "AGameModeBase",
    module: "Engine",
    parent: "AActor",
    description: "Defines game rules. Only exists on server. Sets default Pawn, PlayerController, GameState classes.",
    headerPath: "GameFramework/GameModeBase.h",
    category: "Framework",
  },
  {
    name: "AGameStateBase",
    module: "Engine",
    parent: "AActor",
    description: "Replicated game state accessible to all clients. Tracks match state, scores, player array.",
    headerPath: "GameFramework/GameStateBase.h",
    category: "Framework",
  },
  {
    name: "APlayerState",
    module: "Engine",
    parent: "AActor",
    description: "Replicated per-player state. Persists across Pawn respawns. Stores player name, score, unique ID.",
    headerPath: "GameFramework/PlayerState.h",
    category: "Framework",
  },

  // Components
  {
    name: "UActorComponent",
    module: "Engine",
    parent: "UObject",
    description: "Base component without transform. For logic-only components (health, inventory, abilities).",
    headerPath: "Components/ActorComponent.h",
    category: "Components",
  },
  {
    name: "USceneComponent",
    module: "Engine",
    parent: "UActorComponent",
    description: "Component with transform (position, rotation, scale). Can be attached to other components.",
    headerPath: "Components/SceneComponent.h",
    category: "Components",
  },
  {
    name: "UStaticMeshComponent",
    module: "Engine",
    parent: "UMeshComponent",
    description: "Renders a static mesh. Supports Nanite, collision, LODs, and material overrides.",
    headerPath: "Components/StaticMeshComponent.h",
    category: "Components",
  },
  {
    name: "USkeletalMeshComponent",
    module: "Engine",
    parent: "UMeshComponent",
    description: "Renders a skeletal mesh with animation. Used for characters, creatures, and animated objects.",
    headerPath: "Components/SkeletalMeshComponent.h",
    category: "Components",
  },
  {
    name: "UCameraComponent",
    module: "Engine",
    parent: "USceneComponent",
    description: "Camera view. Usually attached to SpringArm for third-person or directly for first-person.",
    headerPath: "Camera/CameraComponent.h",
    category: "Components",
  },
  {
    name: "USpringArmComponent",
    module: "Engine",
    parent: "USceneComponent",
    description: "Maintains child at fixed distance. Handles camera collision avoidance and lag.",
    headerPath: "GameFramework/SpringArmComponent.h",
    category: "Components",
  },
  {
    name: "UCharacterMovementComponent",
    module: "Engine",
    parent: "UPawnMovementComponent",
    description: "Full-featured movement for Characters. Walking, falling, flying, swimming, custom modes.",
    headerPath: "GameFramework/CharacterMovementComponent.h",
    category: "Components",
  },
  {
    name: "UCapsuleComponent",
    module: "Engine",
    parent: "UShapeComponent",
    description: "Capsule collision shape. Default root for ACharacter.",
    headerPath: "Components/CapsuleComponent.h",
    category: "Components",
  },
  {
    name: "UBoxComponent",
    module: "Engine",
    parent: "UShapeComponent",
    description: "Box collision shape for triggers, overlap zones, and simple collision.",
    headerPath: "Components/BoxComponent.h",
    category: "Components",
  },
  {
    name: "USphereComponent",
    module: "Engine",
    parent: "UShapeComponent",
    description: "Sphere collision shape for radial triggers and detection zones.",
    headerPath: "Components/SphereComponent.h",
    category: "Components",
  },
  {
    name: "UWidgetComponent",
    module: "UMG",
    parent: "UMeshComponent",
    description: "Renders a UMG widget in 3D world space. For health bars, nameplates, interaction prompts.",
    headerPath: "Components/WidgetComponent.h",
    category: "Components",
  },

  // GAS (Gameplay Ability System)
  {
    name: "UAbilitySystemComponent",
    module: "GameplayAbilities",
    parent: "UGameFrameworkComponent",
    description: "Central GAS component. Manages abilities, effects, tags, and attributes for an actor.",
    headerPath: "AbilitySystemComponent.h",
    category: "GAS",
  },
  {
    name: "UGameplayAbility",
    module: "GameplayAbilities",
    parent: "UObject",
    description: "Defines an ability's behavior. Override ActivateAbility, EndAbility, CanActivateAbility.",
    headerPath: "Abilities/GameplayAbility.h",
    category: "GAS",
  },
  {
    name: "UGameplayEffect",
    module: "GameplayAbilities",
    parent: "UObject",
    description: "Data-driven effect that modifies attributes. Instant, Duration, or Infinite. Blueprint-configurable.",
    headerPath: "GameplayEffect.h",
    category: "GAS",
  },
  {
    name: "UAttributeSet",
    module: "GameplayAbilities",
    parent: "UObject",
    description: "Container for gameplay attributes (Health, Mana, etc). Use ATTRIBUTE_ACCESSORS macro.",
    headerPath: "AttributeSet.h",
    category: "GAS",
  },
  {
    name: "UAbilityTask",
    module: "GameplayAbilities",
    parent: "UGameplayTask",
    description: "Async building block for abilities. Wait for events, montages, target data, delays.",
    headerPath: "Abilities/Tasks/AbilityTask.h",
    category: "GAS",
  },

  // Enhanced Input
  {
    name: "UInputMappingContext",
    module: "EnhancedInput",
    parent: "UDataAsset",
    description: "Maps Input Actions to physical keys/buttons. Supports priority and modifiers.",
    headerPath: "InputMappingContext.h",
    category: "Input",
  },
  {
    name: "UInputAction",
    module: "EnhancedInput",
    parent: "UDataAsset",
    description: "Defines a single input action (e.g., Jump, Move). Value type: bool, float, Vector2D, Vector3D.",
    headerPath: "InputAction.h",
    category: "Input",
  },
  {
    name: "UEnhancedInputComponent",
    module: "EnhancedInput",
    parent: "UInputComponent",
    description: "Input component with Enhanced Input support. Bind to InputActions with BindAction().",
    headerPath: "EnhancedInputComponent.h",
    category: "Input",
  },

  // AI
  {
    name: "UBehaviorTree",
    module: "AIModule",
    parent: "UObject",
    description: "AI decision tree. Root has Selector/Sequence composites, with Task and Decorator nodes.",
    headerPath: "BehaviorTree/BehaviorTree.h",
    category: "AI",
  },
  {
    name: "AAIController",
    module: "AIModule",
    parent: "AController",
    description: "Controller for AI-driven pawns. Runs BehaviorTrees and manages Blackboard data.",
    headerPath: "AIController.h",
    category: "AI",
  },
  {
    name: "UBlackboardComponent",
    module: "AIModule",
    parent: "UActorComponent",
    description: "Shared memory for BehaviorTrees. Stores key-value pairs (vectors, objects, enums, bools).",
    headerPath: "BehaviorTree/BlackboardComponent.h",
    category: "AI",
  },

  // UI
  {
    name: "UUserWidget",
    module: "UMG",
    parent: "UWidget",
    description: "Base class for UMG widget Blueprints. Override NativeConstruct, NativeTick.",
    headerPath: "Blueprint/UserWidget.h",
    category: "UI",
  },
  {
    name: "UCommonActivatableWidget",
    module: "CommonUI",
    parent: "UUserWidget",
    description: "Widget with activation/deactivation lifecycle. Foundation of CommonUI widget stack.",
    headerPath: "CommonActivatableWidget.h",
    category: "UI",
  },

  // Subsystems
  {
    name: "UGameInstanceSubsystem",
    module: "Engine",
    parent: "USubsystem",
    description: "Subsystem tied to UGameInstance lifetime. For persistent game-wide services.",
    headerPath: "Subsystems/GameInstanceSubsystem.h",
    category: "Subsystems",
  },
  {
    name: "UWorldSubsystem",
    module: "Engine",
    parent: "USubsystem",
    description: "Subsystem tied to UWorld lifetime. For per-level services and systems.",
    headerPath: "Subsystems/WorldSubsystem.h",
    category: "Subsystems",
  },
  {
    name: "ULocalPlayerSubsystem",
    module: "Engine",
    parent: "USubsystem",
    description: "Subsystem tied to ULocalPlayer. For per-player services (settings, input, UI state).",
    headerPath: "Subsystems/LocalPlayerSubsystem.h",
    category: "Subsystems",
  },

  // Rendering
  {
    name: "UMaterialInterface",
    module: "Engine",
    parent: "UObject",
    description: "Base for materials and material instances. Supports Substrate/Nanite/Lumen rendering.",
    headerPath: "Materials/MaterialInterface.h",
    category: "Rendering",
  },
  {
    name: "UNiagaraSystem",
    module: "Niagara",
    parent: "UFXSystemAsset",
    description: "Particle system asset. Contains emitters, modules, and simulation settings.",
    headerPath: "NiagaraSystem.h",
    category: "Rendering",
  },
  {
    name: "UNiagaraComponent",
    module: "Niagara",
    parent: "UFXSystemComponent",
    description: "Component that runs a Niagara particle system in the world.",
    headerPath: "NiagaraComponent.h",
    category: "Rendering",
  },

  // Animation
  {
    name: "UAnimInstance",
    module: "Engine",
    parent: "UObject",
    description: "Base class for Animation Blueprints. Override NativeUpdateAnimation for custom logic.",
    headerPath: "Animation/AnimInstance.h",
    category: "Animation",
  },
  {
    name: "UAnimMontage",
    module: "Engine",
    parent: "UAnimCompositeBase",
    description: "Composite animation asset with sections, notifies, and branching points. Used for attacks, abilities.",
    headerPath: "Animation/AnimMontage.h",
    category: "Animation",
  },

  // Materials (extended)
  {
    name: "UMaterial",
    module: "Engine",
    parent: "UMaterialInterface",
    description: "Material asset with shader graph. Defines surface properties, blend mode, shading model.",
    headerPath: "Materials/Material.h",
    category: "Rendering",
  },
  {
    name: "UMaterialInstanceDynamic",
    module: "Engine",
    parent: "UMaterialInstance",
    description: "Runtime-modifiable material instance. Set scalar, vector, and texture parameters at runtime.",
    headerPath: "Materials/MaterialInstanceDynamic.h",
    category: "Rendering",
  },

  // Networking
  {
    name: "UGameplayStatics",
    module: "Engine",
    parent: "UBlueprintFunctionLibrary",
    description: "Static utility functions: SpawnActor, GetPlayerController, OpenLevel, ApplyDamage, and more.",
    headerPath: "Kismet/GameplayStatics.h",
    category: "Framework",
  },

  // Level Streaming
  {
    name: "ULevelStreamingDynamic",
    module: "Engine",
    parent: "ULevelStreaming",
    description: "Dynamically load/unload levels at runtime. Used for streaming sub-levels and World Partition.",
    headerPath: "Engine/LevelStreamingDynamic.h",
    category: "Framework",
  },

  // AI Perception
  {
    name: "UAIPerceptionComponent",
    module: "AIModule",
    parent: "UActorComponent",
    description: "AI perception with configurable senses: sight, hearing, damage, touch, team, prediction.",
    headerPath: "Perception/AIPerceptionComponent.h",
    category: "AI",
  },

  // Sequencer
  {
    name: "ULevelSequence",
    module: "LevelSequence",
    parent: "UMovieSceneSequence",
    description: "Cinematic sequence asset. Controls actors, cameras, animations, audio over time.",
    headerPath: "LevelSequence.h",
    category: "Rendering",
  },
];

export const UE5_CATEGORIES = [
  "Framework",
  "Components",
  "GAS",
  "Input",
  "AI",
  "UI",
  "Subsystems",
  "Rendering",
  "Animation",
] as const;

export type UE5Category = (typeof UE5_CATEGORIES)[number];
