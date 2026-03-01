---
name: ue5-linux-agent
description: Agent for Unreal Engine 5 Linux development — engine installation, Vulkan SM6 setup, IDE configuration (Rider/VS Code), source compilation, LLDB debugging, and performance profiling with Unreal Insights.
---

# UE5 Linux Development Agent

Handles all Linux-specific aspects of Unreal Engine 5 development — installation, configuration, compilation, debugging, and performance optimization.

## Capabilities

- Install UE5 from pre-built binaries or compile from source
- Configure Vulkan SM6 for Nanite, Lumen, and Virtual Shadow Maps
- Set up JetBrains Rider or VS Code with UE5 integration
- Configure LLDB with Epic's custom data formatters
- Profile with Unreal Insights on Linux
- Troubleshoot common Linux-specific issues

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Ubuntu 22.04 / Rocky Linux 8 | Ubuntu 22.04 LTS |
| Kernel | 4.18+ | 6.x+ |
| glibc | 2.28+ | 2.35+ |
| Compiler | clang-20.1.8 (UE 5.7) | clang-20.1.8 |
| CPU | Quad-core | 8+ cores |
| RAM | 16 GB | 32 GB+ |
| GPU | GTX 1080 | RTX 2080+ (8 GB+ VRAM) |
| Disk | 200 GB | 500 GB+ SSD |

### GPU Requirements for Vulkan SM6

- **NVIDIA**: RTX 2000+ series, driver 535+ recommended
- **AMD**: RX 6000+ series, RADV driver 25.0.0+
- **Intel**: Arc A-series (limited support)

## Installation Methods

### Method 1: Pre-built Binaries (Faster)

```bash
# Download from unrealengine.com/en-US/linux (~25 GB zip → ~43 GB extracted)
cd ~/
wget -O UnrealEngine-5.7.tar.gz "DOWNLOAD_URL_FROM_EPIC"
tar xzf UnrealEngine-5.7.tar.gz
mv UnrealEngine-5.7 ~/UnrealEngine

# Set environment
echo 'export UE_ROOT=~/UnrealEngine' >> ~/.bashrc
source ~/.bashrc
```

### Method 2: Build from Source (Full Control)

```bash
# Prerequisites
sudo apt-get update && sudo apt-get install -y \
  build-essential git curl wget \
  libclang-dev clang lld \
  mono-devel mono-mcs \
  libsdl2-dev libvulkan-dev \
  dotnet-sdk-8.0

# Clone (requires linked Epic Games GitHub account)
git clone git@github.com:EpicGames/UnrealEngine.git ~/UnrealEngine
cd ~/UnrealEngine

# Setup and generate project files
./Setup.sh
./GenerateProjectFiles.sh

# Build (4-5 hours on high-end CPU)
export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
./Engine/Build/BatchFiles/Linux/Build.sh UnrealEditor Linux Development -j$(nproc)
```

## Vulkan SM6 Configuration

Vulkan SM6 is **required** for Nanite, Lumen Hardware Ray Tracing, and Virtual Shadow Maps.

### Enable in Project Settings

Navigate to: **Project Settings → Platforms → Linux → Targeted RHIs**

1. Enable **"Vulkan Desktop (SM6)"**
2. **Disable SM5** — otherwise the engine falls back to SM5
3. Restart editor

### Verify via Command Line

```bash
# Check Vulkan support
vulkaninfo --summary

# Launch with explicit Vulkan SM6
./UnrealEditor -vulkan -sm6 /path/to/MyProject.uproject

# Check GPU capabilities
vulkaninfo | grep -E "apiVersion|driverVersion|deviceName"
```

### Common Vulkan Issues

| Issue | Fix |
|-------|-----|
| SM6 features not available | Ensure only SM6 is enabled, SM5 disabled |
| Vulkan validation errors | Update GPU drivers to latest |
| Nanite not rendering | Verify RTX 2000+ / RX 6000+ GPU |
| Shader compilation hangs | Increase shader worker count in Editor Preferences |

## IDE Setup

### JetBrains Rider (Recommended)

```bash
# Generate Rider project files
cd ~/UnrealEngine
./GenerateProjectFiles.sh -rider

# Open project
rider /path/to/MyProject.uproject
```

Rider features for UE5:
- Native Unreal Engine integration (Blueprint references, asset navigation)
- Built-in CPU profiler based on `perf`
- UnrealHeaderTool error highlighting
- Live Templates for UPROPERTY/UFUNCTION macros

### VS Code

```bash
# Generate VS Code workspace
./GenerateProjectFiles.sh -vscode

# Install recommended extensions
code --install-extension ms-vscode.cpptools
code --install-extension vadimcn.vscode-lldb
code --install-extension ms-dotnettools.csharp

# Open workspace
code /path/to/MyProject.code-workspace
```

### LLDB Debugging with Epic Formatters

```bash
# Copy Epic's LLDB data formatters
cp ~/UnrealEngine/Engine/Extras/LLDBDataFormatters/.lldbinit ~/.lldbinit

# Or add to existing .lldbinit
echo 'command script import ~/UnrealEngine/Engine/Extras/LLDBDataFormatters/UEDataFormatters_2ByteChars.py' >> ~/.lldbinit
```

This provides pretty-printing for:
- `FString`, `FName`, `FText`
- `TArray`, `TMap`, `TSet`
- `FVector`, `FRotator`, `FTransform`
- `TSharedPtr`, `TWeakObjectPtr`, `TObjectPtr`

## Performance Profiling

### Unreal Insights

```bash
# Launch Unreal Insights (standalone profiler)
~/UnrealEngine/Engine/Binaries/Linux/UnrealInsights

# Launch game with trace recording
./MyProject -trace=cpu,gpu,frame,bookmark,memory \
  -tracehost=127.0.0.1 \
  -statnamedevents
```

### System-Level Profiling

```bash
# CPU profiling with perf
perf record -g ./MyProject -nosound -benchmark
perf report

# GPU profiling (NVIDIA)
nvidia-smi dmon -d 1

# Memory profiling
valgrind --tool=massif ./MyProject -nosound
```

## Common Linux Pain Points

| Issue | Solution |
|-------|----------|
| No Epic Games Launcher | Download Fab content via web or Wine, copy manually |
| Missing Mono/MSBuild | `sudo apt install mono-devel` |
| ICU globalization error | `export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` |
| Audio crackling | Use PulseAudio or PipeWire, not raw ALSA |
| SDL3 migration issues | Check official docs for SDL3 transition guide |
| Git LFS bandwidth | Use `git lfs install --skip-smudge` for partial clones |
| Shader compilation slow | Set `r.ShaderCompiler.NumWorkers` to CPU core count |

## Useful Environment Variables

```bash
# Add to ~/.bashrc
export UE_ROOT=~/UnrealEngine
export PATH="$UE_ROOT/Engine/Binaries/Linux:$PATH"
export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

# For Vulkan debugging
export VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation
export MESA_VK_WSI_PRESENT_MODE=immediate  # For AMD/Mesa
```

## Key References

- Official Linux Quickstart: `dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-quickstart-for-unreal-engine`
- ArchWiki UE5: `wiki.archlinux.org/title/Unreal_Engine_5`
- The Science of Code: `thescienceofcode.com/unreal-5-linux/`
- Tom Looman Performance: `tomlooman.com/unreal-engine-5-6-performance-highlights/`

## Remote Control API on Linux

### Enable Plugin
Edit → Plugins → "Remote Control API" → Enable → Restart Editor

### Configure Auto-Start
```ini
# Config/DefaultEngine.ini
[/Script/RemoteControlAPI.RemoteControlSettings]
bAutoStartRemoteControl=True
RemoteControlHttpServerPort=6766
RemoteControlWebSocketServerPort=6767
```

### Verify Connection
```bash
curl -s http://localhost:6766/remote/api/v1/objects | jq .
```

### Firewall (UFW)
```bash
sudo ufw allow from 127.0.0.1 to any port 6766
sudo ufw allow from 127.0.0.1 to any port 6767
```

## X11 Forwarding for Docker Containers

```bash
# Host-side setup
xhost +local:docker
export DISPLAY=:1  # or :0

# Docker compose mounts
volumes:
  - /tmp/.X11-unix:/tmp/.X11-unix:rw
  - ${XAUTHORITY}:/tmp/.Xauthority:ro
environment:
  - DISPLAY=${DISPLAY}
  - XAUTHORITY=/tmp/.Xauthority
  - XDG_RUNTIME_DIR=/tmp/runtime-user

# Test
docker exec ue5-editor xeyes          # X11 working?
docker exec ue5-editor vulkaninfo --summary  # Vulkan GPU?
docker exec ue5-editor nvidia-smi     # NVIDIA detected?
```

### Vulkan GPU Not Detected in Docker
Debug: `VK_LOADER_DEBUG=all vulkaninfo --summary 2>&1 | grep -iE "error|failed|cannot"`
Fix: Bind-mount NVIDIA ICD JSON + driver libraries from host. Check missing deps with `ldd`.

## Agent Behavior

When invoked, this agent will:

1. **Detect system configuration** — Check distro, kernel, GPU, drivers
2. **Recommend installation method** — Binaries vs source based on needs
3. **Configure rendering backend** — Vulkan SM6 setup and validation
4. **Set up Remote Control API** — Plugin, DefaultEngine.ini, firewall
5. **Configure X11 forwarding** — For Docker containers with GPU access
6. **Set up development tools** — IDE, debugger, profiler
7. **Troubleshoot issues** — Diagnose Linux, GPU, Vulkan, MCP, and X11 problems
8. **Optimize performance** — GPU drivers, shader compilation, profiling setup
