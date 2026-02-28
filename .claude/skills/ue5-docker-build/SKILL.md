---
name: ue5-docker-build
description: Build, package, and deploy Unreal Engine 5 projects using Docker containers. Generates Dockerfiles, docker-compose configurations, CI/CD pipelines, and GPU passthrough setups for UE5 game servers, pixel streaming, and automated builds. Use this skill when someone wants to containerize a UE5 project, set up Docker-based CI/CD for Unreal, deploy a UE5 dedicated server, configure pixel streaming in Docker, or build UE5 projects in containers. Also triggers for mentions of "ue4-docker", "unrealcontainers", "GHCR Epic images", or "containerized Unreal builds".
---

# UE5 Docker Build Skill

Creates Docker-based build and deployment configurations for Unreal Engine 5 projects. Covers the full pipeline from containerized compilation to production deployment.

## Process

### Step 1: Determine Deployment Target

Ask the user what they need:

| Target | Description |
|--------|-------------|
| **Game Server** | Headless dedicated server in minimal container |
| **Pixel Streaming** | GPU-accelerated client with browser-based streaming |
| **CI/CD Build** | Automated build pipeline (GitHub Actions / GitLab CI) |
| **Development** | Full editor in container for reproducible builds |
| **All-in-One** | Complete stack with server + streaming + signaling |

### Step 2: Gather Project Details

- **Project name** (for container naming)
- **UE version** (5.5, 5.6, 5.7)
- **Build configuration** (Development, Shipping)
- **Target platform** (Linux only for containers)
- **Server map** (default map name for dedicated servers)
- **Port requirements** (game: 7777/udp, streaming: 80/tcp, 8888/tcp)

### Step 3: Generate Configuration

Based on the target, generate the appropriate files. See [references/dockerfiles.md](./references/dockerfiles.md) for the full template library.

#### Game Server Dockerfile

```dockerfile
# Multi-stage: build then deploy to minimal runtime
FROM ghcr.io/epicgames/unreal-engine:dev-slim-5.7 AS builder
COPY --chown=ue4:ue4 . /tmp/project

RUN /home/ue4/UnrealEngine/Engine/Build/BatchFiles/RunUAT.sh BuildCookRun \
  -project=/tmp/project/${PROJECT_NAME}.uproject \
  -platform=Linux -serverconfig=Shipping \
  -server -noclient \
  -cook -build -stage -pak -archive \
  -archivedirectory=/tmp/project/Packaged

FROM gcr.io/distroless/cc-debian12:nonroot
COPY --from=builder --chown=nonroot:nonroot \
  /tmp/project/Packaged/LinuxServer /home/nonroot/server
EXPOSE 7777/udp
ENTRYPOINT ["/home/nonroot/server/${PROJECT_NAME}/Binaries/Linux/${PROJECT_NAME}Server"]
```

#### Docker Compose for Full Stack

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
      - UE_MAP=DefaultMap
      - UE_MAX_PLAYERS=16

  pixel-streaming:
    build:
      context: .
      dockerfile: Dockerfile.streaming
    ports:
      - "80:80"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu, video]
    depends_on:
      - signaling

  signaling:
    image: ghcr.io/epicgames/pixel-streaming-signalling-server:latest
    ports:
      - "8080:8080"
      - "8888:8888"
```

### Step 4: GPU Passthrough (if needed)

For pixel streaming or any rendering workload:

```bash
# Install NVIDIA Container Toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### Step 5: CI/CD Pipeline

Generate CI/CD configuration for the user's platform. Templates available for:
- GitHub Actions (self-hosted GPU runner)
- GitLab CI (Docker-in-Docker with GPU tags)
- Epic's Horde build system

### Step 6: Build and Test

```bash
# Build the container
docker build -t ${PROJECT_NAME}-server:latest -f Dockerfile.server .

# Test locally
docker run --rm -p 7777:7777/udp ${PROJECT_NAME}-server:latest

# For GPU workloads
docker run --rm --gpus all -p 80:80 ${PROJECT_NAME}-streaming:latest
```

## Important Notes

- **GHCR Access**: Requires GitHub account linked to Epic Games account with `read:packages` PAT
- **Licensing**: UE EULA prohibits public distribution of dev images — use private registries only
- **GPU**: Only available at runtime, NOT during `docker build`
- **Image Sizes**: dev-slim ~35 GB, runtime ~2 GB — always use multi-stage builds
- **Performance**: Containers add <0.5ms to frame time (~110 FPS median)

## Reference Files

- [Dockerfile Templates](./references/dockerfiles.md) — Full library of Dockerfile patterns
