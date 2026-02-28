# Unreal Engine 5 learning resources: a comprehensive guide

**Unreal Engine 5.7, released in February 2026, is the current stable version** — and the ecosystem around it has matured into one of the richest learning environments in game development. This guide compiles the most valuable resources across every skill level, with special attention to Linux development, Docker containerization, and AI-assisted workflows with Claude Code. Whether you're opening the editor for the first time or architecting a multiplayer Gameplay Ability System in C++, the resources below provide a direct path forward.

Epic now maintains all documentation at **dev.epicgames.com**, replaced the Unreal Marketplace with **Fab** (fab.com), and ships an experimental in-editor AI assistant with UE 5.7. The community has consolidated around the **Unreal Source Discord** (~127K members), and tools like **UnrealClaude** and **CLAUDIUS** bring Claude Code directly into the editor.

---

## Engine versions and official documentation

UE5 follows a roughly six-month release cadence. **UE 5.7** (February 2026) introduced Nanite Foliage (Experimental), production-ready PCG Framework and Substrate materials, MegaLights (Beta), and a native in-editor AI assistant. UE 5.6 (June 2025) brought 60fps open worlds and the in-engine MetaHuman Creator. UE 5.5 (November 2024) marked MegaLights' experimental debut and Path Tracer reaching production-ready status.

All official documentation lives at `dev.epicgames.com/documentation/en-us/unreal-engine/`. Key portals include:

- **C++ API Reference**: `dev.epicgames.com/documentation/en-us/unreal-engine/API`
- **Blueprint API Reference**: `dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI`
- **C++ Programming Guide**: `dev.epicgames.com/documentation/en-us/unreal-engine/programming-with-cplusplus-in-unreal-engine`
- **Epic C++ Coding Standard**: `dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine`
- **Source Code Access**: `github.com/EpicGames/UnrealEngine` (private; requires linked Epic Games account)
- **Public Roadmap**: `portal.productboard.com/epicgames/1-unreal-engine-public-roadmap`

The **Epic Developer Community Learning Portal** at `dev.epicgames.com/community/learning/` hosts **225+ hours** of free courses and guided learning paths. Epic also offers a free **Game Design Professional Certificate on Coursera** — eight courses covering game design, level design, Blueprint scripting, and visual development.

---

## Beginner resources: your first steps in UE5

The fastest on-ramp is Epic's own **2025 Crash Course for New Unreal Engine Developers**, a free curated learning path on the Epic Developer Community. Pair it with **"Your First Hour in Unreal Engine 5"** — a guided 50-minute official tutorial that walks through project creation, assets, lighting, and Blueprints.

**Unreal Sensei's 5-hour YouTube beginner tutorial** is the most-viewed UE5 starter series, covering 3D navigation, PBR materials, landscape sculpting, Megascans, Lumen lighting, and Blueprints while building a photorealistic castle scene. It's entirely free and Blueprint-focused. For those wanting C++ from the start, **GameDev.tv's "Unreal Engine 5 C++ Developer" course on Udemy** (30+ hours, regularly updated for UE 5.6) teaches C++ from zero through four complete game projects.

**Smart Poly** offers a solid free YouTube playlist covering UE5 basics and Blueprint fundamentals, while **David Nixon's "Complete Beginner's Course"** on Udemy provides structured, project-based learning. All beginners should download the **Lyra Starter Game** from Fab — Epic's flagship sample project demonstrating best-practice architecture with GAS, Enhanced Input, and modular game features.

Key YouTube channels for beginners: Unreal Sensei, Smart Poly, Ryan Laley, Gorka Games, and CGDealers.

---

## Intermediate learning: systems, shaders, and architecture

**Ben Cloward's shader and material tutorials** (130+ videos on YouTube) are unmatched for anyone working with materials. A senior technical artist with EA/Frostbite experience, Cloward covers everything from shader graph basics through advanced HLSL custom code, NPR/cel-shading, and performance optimization. The series spans both Unreal and Unity shader systems.

**Alex Forsythe's programming deep-dives** are conceptual overviews that make complex topics click — Game Framework architecture, engine initialization, multiplayer code essentials, and the relationship between C++ and Blueprints. These aren't step-by-step tutorials but rather the kind of content that builds genuine understanding. He shipped AAA titles including Call of Duty: Infinite Warfare.

**Stephen Ulibarri's "UE5 C++ Ultimate Game Developer Course"** on Udemy (updated for UE 5.7) builds a complete action RPG open world, covering Motion Warping, MetaSounds, Niagara VFX, Chaos destruction, and AI behavior trees. **David Nixon's intermediate Udemy course** covers materials, landscapes, skeletal mesh animation, and intermediate Blueprints. **William Faucher** is the go-to for UE5 lighting and Lumen tutorials on YouTube.

The official **Stack-O-Bot** sample (rebuilt for UE 5.6) and **Cropout** casual RTS sample provide excellent intermediate-level reference architectures for third-person and top-down games respectively.

---

## Expert resources: GAS, rendering, and engine internals

**Tom Looman's Professional Game Development in C++ course** ($250, courses.tomlooman.com) is the premier advanced resource. A former Epic Games engineer who taught UE C++ at Stanford (CS193U), Looman covers AI with Behavior Trees and Environment Query System, multiplayer, and performance optimization. His **ActionRoguelike GitHub repository** (4,400+ stars) is the most popular UE5 C++ sample project, featuring a custom ability system, AI, multiplayer networking, and data-oriented design experiments.

For the **Gameplay Ability System**, **Druid Mechanics' Udemy courses** (by Stephen Ulibarri) are the most comprehensive available. The GAS Top-Down RPG course covers every GAS concept — Ability System Components, Gameplay Effects, Tags, Cues, Ability Tasks, Attributes — while building a complete RPG with combat, leveling, spells, and saving. **Dan Tranek's GASDocumentation on GitHub** (`github.com/tranek/GASDocumentation`) remains the definitive community-written reference, covering replication modes, prediction, debugging, and optimization patterns.

For rendering engineering, the **Tricky Bits Blog's 3-part Nanite deep dive** (`trickybitsblog.github.io`) dissects GPU-driven rendering, visibility buffers, and cluster hierarchies. Epic's official Nanite and Lumen documentation pages provide production-level technical details. The **NVIDIA UE5 Raytracing Guide** (PDF) covers Lumen pipeline specifics, RTXDI, and hardware ray tracing optimization. **AMD's GPUOpen UE5 Performance Guide** covers Nanite, Lumen, Virtual Shadow Maps, and TSR/FSR optimization. An excellent **8-episode community tutorial on open-world performance optimization** covers World Partition, HLOD, foliage, draw-call reduction, and VRAM management.

---

## Linux development: setup, compilation, and optimization

UE5 on Linux is officially supported with **Ubuntu 22.04** and **Rocky Linux 8** as primary platforms. The engine requires kernel 4.18+, glibc 2.28+, and **clang-20.1.8** for UE 5.7. Recommended hardware is a quad-core CPU, **32 GB RAM**, and an **RTX 2080** or better with 8 GB+ VRAM.

**Two installation methods exist.** Pre-compiled binaries can be downloaded from `unrealengine.com/en-US/linux` — a ~25 GB zip that extracts to ~43 GB. Building from source requires linking your GitHub account to Epic Games at `unrealengine.com`, cloning the private repository, then running `./Setup.sh`, `./GenerateProjectFiles.sh`, and `./Engine/Build/BatchFiles/Linux/Build.sh UnrealEditor Linux Development`. Expect **4–5 hours** of compilation on a high-end consumer CPU and **500 GB+** of free disk space. A common gotcha: set `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` if you hit ICU package errors.

**Enabling Vulkan SM6 is critical** for Nanite, Lumen Hardware Ray Tracing, and Virtual Shadow Maps on Linux. In Project Settings → Platforms → Linux → Targeted RHIs, enable "Vulkan Desktop (SM6)" and *disable* SM5 — otherwise the engine falls back to SM5. NVIDIA RTX 2000+ or AMD RX 6000+ GPUs are required. For AMD, RADV driver version 25.0.0+ is recommended.

For IDE setup, **JetBrains Rider** is the community favorite on Linux with built-in Unreal Engine integration and a native CPU profiler based on `perf`. **VS Code** is Epic's recommended free option — generate a workspace with `./GenerateProjectFiles.sh -vscode`. LLDB with Epic's custom data formatters (available at `Engine/Extras/LLDBDataFormatters`) provides debugging with pretty-printed UE types. **Unreal Insights** (`Engine/Binaries/Linux/UnrealInsights`) works fully on Linux for CPU/GPU profiling.

The biggest Linux pain point remains the **absence of the Epic Games Launcher** — marketplace/Fab content must be downloaded via Wine/VM or the web, then copied manually. Epic is migrating to SDL3 on Linux, and the transition documentation is available in the official docs.

Key Linux references:
- Official Linux Quickstart: `dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-quickstart-for-unreal-engine`
- ArchWiki UE5: `wiki.archlinux.org/title/Unreal_Engine_5`
- The Science of Code guide: `thescienceofcode.com/unreal-5-linux/`
- Tom Looman's UE 5.6 performance highlights: `tomlooman.com/unreal-engine-5-6-performance-highlights/`

---

## Docker containerization for UE5 development

Epic provides **official prebuilt container images** via GitHub Container Registry at `ghcr.io/epicgames/unreal-engine`. Tags include `dev-{VERSION}` (full development images), `dev-slim-{VERSION}` (recommended, ~35.7 GB), `runtime` (minimal runtime), and `runtime-pixel-streaming` (with NVENC support). Access requires a GitHub account linked to your Epic Games account with a `read:packages` token.

The foundational tooling is **ue4-docker** (`github.com/adamrehn/ue4-docker`, 831+ stars), a Python package that builds Docker images for UE4/UE5. Install with `pip install ue4-docker`, then build images targeting specific engine versions. The companion site **unrealcontainers.com** is the community hub with comprehensive guides for CI/CD, pixel streaming, dedicated servers, and GPU acceleration.

**GPU passthrough** requires the NVIDIA Container Toolkit — install it, configure the Docker runtime with `nvidia-ctk runtime configure --runtime=docker`, then run containers with `--gpus=all`. GPU access is only available at runtime, not during `docker build`. For Docker Compose, use the `deploy.resources.reservations.devices` block to reserve GPU access.

A practical multi-stage Dockerfile pattern packages a UE5 project into a minimal runtime image:

```dockerfile
FROM ghcr.io/epicgames/unreal-engine:dev-slim-5.0.0 AS builder
COPY --chown=ue4:ue4 . /tmp/project
RUN /home/ue4/UnrealEngine/Engine/Build/BatchFiles/RunUAT.sh BuildCookRun \
  -platform=Linux -clientconfig=Shipping \
  -project=/tmp/project/MyProject.uproject \
  -cook -build -stage -pak -archive -archivedirectory=/tmp/project/Packaged

FROM gcr.io/distroless/cc-debian10:nonroot
COPY --from=builder --chown=nonroot:nonroot /tmp/project/Packaged/LinuxServer /home/nonroot/project
EXPOSE 7777/udp
ENTRYPOINT ["/home/nonroot/project/MyProject/Binaries/Linux/MyProjectServer"]
```

For CI/CD, **Epic's Horde build system** runs via Docker with Redis and MongoDB backends. **GitHub Actions** options include the `UE5-Build-Project` marketplace action and Guganana's `UnrealPluginCIWithGithubActions` (using a compressed ~150 MB "MinimalUE"). TensorWorks benchmarks show Linux containers add **less than 0.5ms** to average frame time, maintaining ~110 FPS median.

**Critical licensing note**: The Unreal Engine EULA prohibits public distribution of development images. You can only share them via private registries with other Engine Licensees.

---

## Claude Code integration with UE5 development

The most productive real-world setup pairs **JetBrains Rider with Claude Code running in a terminal** alongside it. Developer Kyle Smyth documents this workflow at `sharkpillow.com/post/rider-claude/`: write C++ in Rider, debug with Live Coding hot-reload, and invoke Claude Code for scaffolding, pattern matching, and rapid iteration. As he notes, "Because Unreal is open source, Claude has a complete understanding of the engine."

Three editor-integrated plugins bring Claude directly into UE5:

- **UnrealClaude** (free, open source, `github.com/Natfii/UnrealClaude`) — a native UE 5.7 editor plugin with 20+ MCP tools for actor manipulation, Blueprint editing, level management, and materials. It includes a dynamic UE 5.7 context system that provides accurate API documentation on demand.
- **CLAUDIUS CODE** ($49.99, `claudiuscode.com`) — a commercial plugin with **130+ commands across 19 categories** including Level, Sequencer, AI, Blueprint, Niagara, and Source Control. It ships with a pre-written CLAUDE.md that documents every command, so Claude Code automatically understands the full command set.
- **Node to Code** (free, `github.com/protospatial/NodeToCode`) — translates Blueprint graphs to clean C++ with a single click, supporting Claude, Gemini, and OpenAI models.

A well-structured **CLAUDE.md file** is essential for UE5 projects. Place it at the project root with your tech stack, directory layout, coding conventions (Epic's prefix system: A for Actors, U for UObjects, F for structs), build commands, and gameplay framework hierarchy. Keep it under ~150 lines and use progressive disclosure — tell Claude *how to find* information rather than listing everything. Use `.claude/settings.json` to exclude Binaries/, Intermediate/, and Saved/ directories from context.

Best practices for prompting: be extremely specific about class names, parent classes, and macro decorators; provide architectural context about your GameMode → GameState → PlayerController → Pawn hierarchy; and explicitly specify whether you want C++ or Blueprint output. Use `/clear` between unrelated tasks to manage context in large codebases.

UE 5.7's own **built-in AI assistant** (Experimental) provides contextual help accessible by pressing F1 over any UI element, but it complements rather than replaces Claude Code's deeper agentic capabilities.

---

## Project templates and starter repositories

**Lyra Starter Game** is the single most important learning project. Available free on Fab, it demonstrates production-quality architecture: Gameplay Ability System, Enhanced Input, modular Game Features plugin design, cross-platform scalability, and Epic Online Services multiplayer. Every UE5 developer should study it.

The built-in project wizard offers templates for First Person, Third Person, Top Down, Vehicle, Side Scroller, VR, and AR — plus UE 5.6 added template variants (Combat, Platformer, Strategy, Twin Stick). The **City Sample** from The Matrix Awakens demo showcases World Partition, Nanite, and Lumen at urban scale. **Stack-O-Bot** (rebuilt for UE 5.6) and **Cropout** (casual RTS) round out the official samples.

On GitHub, **Tom Looman's ActionRoguelike** (4,400+ stars, `github.com/tomlooman/ActionRoguelike`) is the gold standard for UE5 C++ learning — a complete action roguelike with a custom ability system, AI, multiplayer, and save systems, updated for UE 5.6. The **Allar UE5 Style Guide** (6,100+ stars, `github.com/Allar/ue5-style-guide`) is the community standard for project structure and asset naming conventions. For GAS specifically, **Narxim-GAS-Example** provides a clean, actively maintained starter with UE 5.5 support, while **Project Elementus** offers a modular third-person template with GAS and Enhanced Input.

For multiplayer, notable starters include **UE5_EOSTemplate** (Epic Online Services + Steam integration), **JustAnotherLobby** (C++ lobby system with CommonUI), and **Multiplayer-Party-Game-Template-UE5** (modular minigame architecture). **MOZGIII/ue5-gitignore** provides a complete `.gitignore` and `.gitattributes` with proper Git LFS tracking for UE5 projects.

Fab's **bi-weekly free content rotation** (formerly monthly) makes select paid products free for two weeks — claim them at `fab.com/limited-time-free`. Permanently free assets include Lyra, City Sample, all Quixel Megascans, and the new **Niagara Examples Pack** (50+ VFX systems) released with UE 5.7.

---

## Community forums and where to get help

The UE5 community is spread across several key hubs. The **official Unreal Engine Forums** at `forums.unrealengine.com` are Discourse-based with categories for Programming, Blueprint, Rendering, Animation, and more, actively moderated by Epic staff. **Unreal Source Discord** (formerly Unreal Slackers) at `discord.com/invite/unrealsource` is the largest independent community with ~127,000 members and deep technical channels for C++, Blueprints, rendering, and marketplace discussion. Epic does not operate an official Discord server.

On Reddit, **r/unrealengine** is the primary subreddit for technical discussions and showcases, while **r/unrealengine5** focuses specifically on UE5 content. Stack Overflow's `[unreal-engine5]` and `[unreal-engine]` tags handle specific code questions.

Notable community sites include **Tom Looman's blog** (`tomlooman.com`) for C++ tutorials and performance analysis, **Unreal Garden** (`unreal-garden.com`) for curated tutorials, and **GameFromScratch.com** for timely coverage of UE releases. The **Coop56/awesome-unreal** GitHub list provides a comprehensive, categorized collection of open-source UE5 resources and plugins.

---

## Conclusion

The UE5 learning ecosystem in 2026 is remarkably mature. **Three resources stand out as essential starting points**: the Epic Developer Community Learning Portal for structured courses, Lyra Starter Game for production-quality reference architecture, and Tom Looman's ActionRoguelike for C++ best practices. Linux development is fully viable with Vulkan SM6 enabling the complete Nanite/Lumen feature set, though the absence of the Epic Games Launcher on Linux remains a friction point. Docker containerization through Epic's official GHCR images and unrealcontainers.com tooling makes CI/CD and dedicated server deployment straightforward. The Claude Code integration ecosystem — particularly the Rider + Claude Code terminal workflow combined with plugins like UnrealClaude or CLAUDIUS — represents a genuine productivity multiplier for UE5 C++ development, with CLAUDE.md serving as the critical bridge between your project's architecture and AI assistance.