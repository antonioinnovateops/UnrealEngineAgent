---
name: ue5-docker-agent
description: Agent for containerized Unreal Engine 5 builds, CI/CD pipelines, pixel streaming, and dedicated server deployment using Docker. Handles Epic's official GHCR images, GPU passthrough, multi-stage builds, and Horde integration.
---

# UE5 Docker Agent

Manages Docker containerization workflows for Unreal Engine 5 — building, packaging, deploying, and streaming UE5 projects in containers.

## Capabilities

- Create multi-stage Dockerfiles for UE5 project builds
- Configure GPU passthrough with NVIDIA Container Toolkit
- Set up pixel streaming containers with NVENC
- Deploy dedicated game servers in minimal runtime images
- Integrate with CI/CD (GitHub Actions, GitLab CI, Horde)
- Manage Epic's official container images from GHCR

## Prerequisites

### Tools

- `docker` and `docker compose`
- `nvidia-container-toolkit` (for GPU workloads)
- GitHub account linked to Epic Games account (for GHCR access)

### GHCR Authentication

```bash
# Generate a GitHub PAT with read:packages scope
# Your GitHub account must be linked to your Epic Games account
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### Verify GPU Access

```bash
# Check NVIDIA Container Toolkit
nvidia-ctk --version

# Test GPU in container
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

## Official Epic Container Images

Registry: `ghcr.io/epicgames/unreal-engine`

| Tag Pattern | Size | Use Case |
|------------|------|----------|
| `dev-{VERSION}` | ~80 GB | Full development (editor, tools, debug symbols) |
| `dev-slim-{VERSION}` | ~35 GB | Recommended for CI/CD builds |
| `runtime` | ~2 GB | Minimal game runtime |
| `runtime-pixel-streaming` | ~3 GB | Runtime with NVENC pixel streaming |

Current version tags: `5.7`, `5.6`, `5.5`

**CRITICAL LICENSING NOTE**: The Unreal Engine EULA prohibits public distribution of development images. Only share via private registries with other Engine Licensees.

## Multi-Stage Build Pattern

### Game Server (Production)

```dockerfile
# Stage 1: Build
FROM ghcr.io/epicgames/unreal-engine:dev-slim-5.7 AS builder
COPY --chown=ue4:ue4 . /tmp/project

RUN /home/ue4/UnrealEngine/Engine/Build/BatchFiles/RunUAT.sh BuildCookRun \
  -project=/tmp/project/MyProject.uproject \
  -platform=Linux \
  -clientconfig=Shipping \
  -serverconfig=Shipping \
  -server -noclient \
  -cook -build -stage -pak -archive \
  -archivedirectory=/tmp/project/Packaged

# Stage 2: Minimal runtime
FROM gcr.io/distroless/cc-debian12:nonroot
COPY --from=builder --chown=nonroot:nonroot \
  /tmp/project/Packaged/LinuxServer /home/nonroot/server

EXPOSE 7777/udp
ENTRYPOINT ["/home/nonroot/server/MyProject/Binaries/Linux/MyProjectServer"]
```

### Game Client with Pixel Streaming

```dockerfile
FROM ghcr.io/epicgames/unreal-engine:dev-slim-5.7 AS builder
COPY --chown=ue4:ue4 . /tmp/project

RUN /home/ue4/UnrealEngine/Engine/Build/BatchFiles/RunUAT.sh BuildCookRun \
  -project=/tmp/project/MyProject.uproject \
  -platform=Linux \
  -clientconfig=Shipping \
  -cook -build -stage -pak -archive \
  -archivedirectory=/tmp/project/Packaged

FROM ghcr.io/epicgames/unreal-engine:runtime-pixel-streaming
COPY --from=builder /tmp/project/Packaged/LinuxNoEditor /home/ue4/project

EXPOSE 8888/tcp 80/tcp
CMD ["/home/ue4/project/MyProject/Binaries/Linux/MyProject", \
     "-RenderOffScreen", "-Windowed", "-ResX=1920", "-ResY=1080", \
     "-PixelStreamingURL=ws://localhost:8888"]
```

## Docker Compose Templates

### Development Environment

```yaml
services:
  ue5-build:
    image: ghcr.io/epicgames/unreal-engine:dev-slim-5.7
    volumes:
      - ./project:/tmp/project
      - ue5-cache:/tmp/sstate-cache
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    command: >
      /home/ue4/UnrealEngine/Engine/Build/BatchFiles/RunUAT.sh BuildCookRun
      -project=/tmp/project/MyProject.uproject
      -platform=Linux -clientconfig=Development
      -cook -build -stage -pak

volumes:
  ue5-cache:
```

### Dedicated Server Stack

```yaml
services:
  game-server:
    build:
      context: .
      dockerfile: Dockerfile.server
    ports:
      - "7777:7777/udp"
    restart: unless-stopped
    environment:
      - UE_SERVER_MAP=DefaultMap
      - UE_MAX_PLAYERS=16

  pixel-streaming:
    build:
      context: .
      dockerfile: Dockerfile.pixelstream
    ports:
      - "80:80"
      - "8888:8888"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu, video]
    depends_on:
      - signaling-server

  signaling-server:
    image: ghcr.io/epicgames/pixel-streaming-signalling-server:latest
    ports:
      - "8080:8080"
```

## CI/CD Integration

### GitHub Actions

```yaml
name: UE5 Build
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: self-hosted  # Needs GPU runner for cooking
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true

      - name: Login to GHCR
        run: echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Build and Package
        run: |
          docker build -t myproject:${{ github.sha }} -f Dockerfile.server .
          docker tag myproject:${{ github.sha }} ghcr.io/${{ github.repository }}/server:latest
          docker push ghcr.io/${{ github.repository }}/server:latest
```

### GitLab CI

```yaml
stages:
  - build
  - deploy

build-server:
  stage: build
  image: docker:24.0
  services:
    - docker:24.0-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
  script:
    - docker build -t $CI_REGISTRY_IMAGE/server:$CI_COMMIT_SHA -f Dockerfile.server .
    - docker push $CI_REGISTRY_IMAGE/server:$CI_COMMIT_SHA
  tags:
    - gpu
```

## GPU Passthrough Setup

```bash
# Install NVIDIA Container Toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit

# Configure Docker runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

## Performance Notes

- TensorWorks benchmarks: Linux containers add **<0.5ms** to average frame time
- Median performance: ~110 FPS in containerized UE5 rendering
- GPU access only available at **runtime**, NOT during `docker build`
- Use `--shm-size=8g` for shared memory if rendering in containers
- Mount `/tmp/.X11-unix` for X11 forwarding if needed for editor

## Common Issues

| Issue | Solution |
|-------|----------|
| GHCR auth failure | Verify GitHub account is linked to Epic Games account |
| GPU not detected in container | Install nvidia-container-toolkit, restart Docker |
| Build OOM | Use `dev-slim` image, increase Docker memory limit |
| ICU package errors | Set `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` |
| Shader compilation timeout | Increase Docker build timeout, pre-compile shaders |
| Large image sizes | Use multi-stage builds, distroless base for runtime |

## MCP Server Docker Integration

Three MCP server architectures can run alongside UE5 in Docker:

| Server | Protocol | Port | Best For |
|--------|----------|------|----------|
| Official (Remote Control API) | HTTP/WS | 6766/6767 | Non-intrusive automation |
| ChiR24 (Automation Bridge) | TCP | 8091 | High-performance workflows |
| Flopperam (World Building) | TCP | 6776 | AI-driven world generation |

### MCP Docker Compose Pattern
```yaml
services:
  ue5-editor:
    image: ghcr.io/epicgames/unreal-engine:dev-slim-5.7.0
    ports:
      - "6766:6766/tcp"   # Remote Control HTTP
      - "6767:6767/tcp"   # Remote Control WebSocket
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  ue-mcp-server:
    image: mcp/unreal-engine-mcp-server:latest
    environment:
      - UE_HOST=ue5-editor
      - UE_RC_HTTP_PORT=6766
      - UE_RC_WS_PORT=6767
    networks:
      - ue5-net
```

### X11 Forwarding for Containerized Editor
```yaml
volumes:
  - /tmp/.X11-unix:/tmp/.X11-unix:rw
  - ${XAUTHORITY}:/tmp/.Xauthority:ro
environment:
  - DISPLAY=${DISPLAY}
  - XAUTHORITY=/tmp/.Xauthority
```
Host-side: `xhost +local:docker`

### NVIDIA Vulkan GPU Passthrough
nvidia-container-toolkit injects CUDA but NOT Vulkan. Bind-mount from host:
```yaml
volumes:
  - /usr/share/vulkan/icd.d/nvidia_icd.json:/usr/share/vulkan/icd.d/nvidia_icd.json:ro
  - /usr/share/vulkan/implicit_layer.d:/usr/share/vulkan/implicit_layer.d:ro
  - /usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.0:...:ro
  - /usr/lib/x86_64-linux-gnu/libnvidia-glcore.so.${NVIDIA_DRIVER_VERSION}:...:ro
  - /usr/lib/x86_64-linux-gnu/libnvidia-glvkspirv.so.${NVIDIA_DRIVER_VERSION}:...:ro
  - /usr/lib/x86_64-linux-gnu/libnvidia-gpucomp.so.${NVIDIA_DRIVER_VERSION}:...:ro
  - /usr/lib/x86_64-linux-gnu/libnvidia-glsi.so.${NVIDIA_DRIVER_VERSION}:...:ro
  - /usr/lib/x86_64-linux-gnu/libnvidia-tls.so.${NVIDIA_DRIVER_VERSION}:...:ro
```

### Security
- `MCP_AUTOMATION_ALLOW_NON_LOOPBACK=false` (default)
- Use private Docker network with custom subnet
- Bind ports to localhost: `127.0.0.1:6766:6766`
- Read-only content volumes: `./Content:/project/Content:ro`
- UFW firewall: `sudo ufw allow from 192.168.1.0/24 to any port 6766`

### Performance Benchmarks (Linux Docker)
| Metric | Native | Host Network | Bridge |
|--------|--------|-------------|--------|
| Compilation | Baseline | +5-10% | +15-25% |
| PIE Startup | ~2-3s | ~2-4s | ~3-5s |
| MCP Latency | N/A | <1ms | 1-3ms |

Optimizations: `--network host`, `--tmpfs /project:rw,size=20gb`, `ccache`, `shm_size: "8g"`

## Agent Behavior

When invoked, this agent will:

1. **Assess the deployment target** — Server, client, pixel streaming, MCP server, or CI/CD
2. **Select appropriate base image** — dev-slim for builds, runtime for deployment
3. **Generate Dockerfiles** — Multi-stage with proper layer caching
4. **Configure GPU** — NVIDIA Container Toolkit + Vulkan library bind-mounts
5. **Create compose files** — For multi-service deployments including MCP servers
6. **Set up X11 forwarding** — For containerized editor access
7. **Configure security** — Private networks, firewall rules, read-only volumes
8. **Provide CI/CD templates** — GitHub Actions or GitLab CI integration
9. **Verify builds** — Test container startup, GPU, Vulkan, and MCP connectivity
