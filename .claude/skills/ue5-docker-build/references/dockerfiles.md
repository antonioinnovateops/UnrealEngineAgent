# UE5 Dockerfile Template Library

## Table of Contents
1. [Game Server (Shipping)](#game-server-shipping)
2. [Pixel Streaming Client](#pixel-streaming-client)
3. [CI/CD Build Agent](#cicd-build-agent)
4. [Development Environment](#development-environment)
5. [MCP Editor with Remote Control](#mcp-editor-with-remote-control)
6. [GitHub Actions Workflow](#github-actions-workflow)
7. [GitLab CI Pipeline](#gitlab-ci-pipeline)

---

## Game Server (Shipping)

Minimal dedicated server for production deployment.

```dockerfile
# Dockerfile.server
FROM ghcr.io/epicgames/unreal-engine:dev-slim-5.7 AS builder

ARG PROJECT_NAME=MyProject

COPY --chown=ue4:ue4 . /tmp/project

RUN /home/ue4/UnrealEngine/Engine/Build/BatchFiles/RunUAT.sh BuildCookRun \
  -project=/tmp/project/${PROJECT_NAME}.uproject \
  -platform=Linux \
  -serverconfig=Shipping \
  -server -noclient \
  -cook -build -stage -pak -archive \
  -archivedirectory=/tmp/project/Packaged \
  -unattended -utf8output

FROM gcr.io/distroless/cc-debian12:nonroot

ARG PROJECT_NAME=MyProject

COPY --from=builder --chown=nonroot:nonroot \
  /tmp/project/Packaged/LinuxServer /home/nonroot/server

EXPOSE 7777/udp
EXPOSE 27015/udp

ENV UE_MAP=DefaultMap
ENV UE_MAX_PLAYERS=16

ENTRYPOINT ["/home/nonroot/server/${PROJECT_NAME}/Binaries/Linux/${PROJECT_NAME}Server"]
CMD ["-log", "-Port=7777"]
```

---

## Pixel Streaming Client

GPU-accelerated client with browser streaming.

```dockerfile
# Dockerfile.streaming
FROM ghcr.io/epicgames/unreal-engine:dev-slim-5.7 AS builder

ARG PROJECT_NAME=MyProject

COPY --chown=ue4:ue4 . /tmp/project

RUN /home/ue4/UnrealEngine/Engine/Build/BatchFiles/RunUAT.sh BuildCookRun \
  -project=/tmp/project/${PROJECT_NAME}.uproject \
  -platform=Linux \
  -clientconfig=Shipping \
  -cook -build -stage -pak -archive \
  -archivedirectory=/tmp/project/Packaged \
  -unattended -utf8output

FROM ghcr.io/epicgames/unreal-engine:runtime-pixel-streaming

ARG PROJECT_NAME=MyProject

COPY --from=builder /tmp/project/Packaged/LinuxNoEditor /home/ue4/project

EXPOSE 8888/tcp 80/tcp

ENV RES_X=1920
ENV RES_Y=1080
ENV PIXEL_STREAMING_URL=ws://signaling:8888

CMD ["/home/ue4/project/${PROJECT_NAME}/Binaries/Linux/${PROJECT_NAME}", \
     "-RenderOffScreen", "-Windowed", \
     "-ResX=${RES_X}", "-ResY=${RES_Y}", \
     "-AudioMixer", "-PixelStreamingURL=${PIXEL_STREAMING_URL}", \
     "-AllowPixelStreamingCommands", "-log"]
```

---

## CI/CD Build Agent

For automated builds without deployment.

```dockerfile
# Dockerfile.build
FROM ghcr.io/epicgames/unreal-engine:dev-slim-5.7

ARG PROJECT_NAME=MyProject

COPY --chown=ue4:ue4 . /tmp/project

# Build only (no cook/package)
RUN /home/ue4/UnrealEngine/Engine/Build/BatchFiles/Linux/Build.sh \
  ${PROJECT_NAME}Editor Linux Development \
  -project=/tmp/project/${PROJECT_NAME}.uproject \
  -WaitMutex -FromMsBuild \
  2>&1 | tee /tmp/build.log

# Run tests
RUN /home/ue4/UnrealEngine/Engine/Build/BatchFiles/RunUAT.sh RunTests \
  -project=/tmp/project/${PROJECT_NAME}.uproject \
  -platform=Linux \
  -unattended -utf8output \
  2>&1 | tee /tmp/test.log
```

---

## Development Environment

Full editor accessible via X11 forwarding or VNC.

```dockerfile
# Dockerfile.dev
FROM ghcr.io/epicgames/unreal-engine:dev-5.7

# Install development tools
USER root
RUN apt-get update && apt-get install -y \
  gdb lldb \
  x11vnc xvfb \
  && rm -rf /var/lib/apt/lists/*
USER ue4

ENV DISPLAY=:1
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

# Start Xvfb and VNC for remote access
CMD Xvfb :1 -screen 0 1920x1080x24 & \
    x11vnc -display :1 -nopw -forever & \
    /home/ue4/UnrealEngine/Engine/Binaries/Linux/UnrealEditor
```

---

## MCP Editor with Remote Control

Docker Compose for UE5 editor with MCP server for Claude Code integration.

```yaml
# docker-compose.mcp.yml
services:
  ue5-editor:
    image: ghcr.io/epicgames/unreal-engine:dev-5.7
    ports:
      - "127.0.0.1:6766:6766/tcp"   # Remote Control HTTP
      - "127.0.0.1:6767:6767/tcp"   # Remote Control WebSocket
    volumes:
      # Project files
      - ./project:/tmp/project
      # X11 forwarding
      - /tmp/.X11-unix:/tmp/.X11-unix:rw
      - ${XAUTHORITY}:/tmp/.Xauthority:ro
      # NVIDIA Vulkan (nvidia-container-toolkit doesn't inject these)
      - /usr/share/vulkan/icd.d/nvidia_icd.json:/usr/share/vulkan/icd.d/nvidia_icd.json:ro
      - /usr/share/vulkan/implicit_layer.d:/usr/share/vulkan/implicit_layer.d:ro
      - /usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.0:/usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.0:ro
      - /usr/lib/x86_64-linux-gnu/libnvidia-glcore.so.${NVIDIA_DRIVER_VERSION}:/usr/lib/x86_64-linux-gnu/libnvidia-glcore.so.${NVIDIA_DRIVER_VERSION}:ro
      - /usr/lib/x86_64-linux-gnu/libnvidia-glvkspirv.so.${NVIDIA_DRIVER_VERSION}:/usr/lib/x86_64-linux-gnu/libnvidia-glvkspirv.so.${NVIDIA_DRIVER_VERSION}:ro
      - /usr/lib/x86_64-linux-gnu/libnvidia-gpucomp.so.${NVIDIA_DRIVER_VERSION}:/usr/lib/x86_64-linux-gnu/libnvidia-gpucomp.so.${NVIDIA_DRIVER_VERSION}:ro
      - /usr/lib/x86_64-linux-gnu/libnvidia-glsi.so.${NVIDIA_DRIVER_VERSION}:/usr/lib/x86_64-linux-gnu/libnvidia-glsi.so.${NVIDIA_DRIVER_VERSION}:ro
      - /usr/lib/x86_64-linux-gnu/libnvidia-tls.so.${NVIDIA_DRIVER_VERSION}:/usr/lib/x86_64-linux-gnu/libnvidia-tls.so.${NVIDIA_DRIVER_VERSION}:ro
    environment:
      - DISPLAY=${DISPLAY}
      - XAUTHORITY=/tmp/.Xauthority
      - XDG_RUNTIME_DIR=/tmp/runtime-user
      - DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    shm_size: "8g"
    command: >
      /home/ue4/UnrealEngine/Engine/Binaries/Linux/UnrealEditor
      /tmp/project/MyProject.uproject

  ue-mcp-server:
    image: mcp/unreal-engine-mcp-server:latest
    environment:
      - UE_HOST=ue5-editor
      - UE_RC_HTTP_PORT=6766
      - UE_RC_WS_PORT=6767
      - MCP_AUTOMATION_ALLOW_NON_LOOPBACK=false
    depends_on:
      - ue5-editor
    networks:
      - default
```

**Setup**: Run `xhost +local:docker` and `export NVIDIA_DRIVER_VERSION=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader | head -1)` on the host before launching.

**Verify**: `curl -s http://localhost:6766/remote/api/v1/objects | jq .`

---

## GitHub Actions Workflow

```yaml
# .github/workflows/ue5-build.yml
name: UE5 Build and Package
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  PROJECT_NAME: MyProject
  UE_VERSION: "5.7"

jobs:
  build:
    runs-on: [self-hosted, gpu, linux]
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
          fetch-depth: 0

      - name: Login to GHCR
        run: echo "${{ secrets.GHCR_TOKEN }}" | docker login ghcr.io -u "${{ secrets.GHCR_USER }}" --password-stdin

      - name: Build Server
        run: |
          docker build \
            --build-arg PROJECT_NAME=${{ env.PROJECT_NAME }} \
            -t ${{ env.PROJECT_NAME }}-server:${{ github.sha }} \
            -f Dockerfile.server .

      - name: Push to Registry
        if: github.ref == 'refs/heads/main'
        run: |
          docker tag ${{ env.PROJECT_NAME }}-server:${{ github.sha }} \
            ghcr.io/${{ github.repository }}/server:latest
          docker push ghcr.io/${{ github.repository }}/server:latest
```

---

## GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

variables:
  PROJECT_NAME: MyProject
  DOCKER_TLS_CERTDIR: "/certs"

build-server:
  stage: build
  image: docker:24.0
  services:
    - docker:24.0-dind
  before_script:
    - echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
  script:
    - docker build --build-arg PROJECT_NAME=$PROJECT_NAME
        -t $CI_REGISTRY_IMAGE/server:$CI_COMMIT_SHA
        -f Dockerfile.server .
    - docker push $CI_REGISTRY_IMAGE/server:$CI_COMMIT_SHA
  tags:
    - gpu
    - docker

deploy-server:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl set image deployment/game-server
        server=$CI_REGISTRY_IMAGE/server:$CI_COMMIT_SHA
  only:
    - main
  tags:
    - deploy
```

---

## Docker Compose Full Stack

```yaml
# docker-compose.yml
version: "3.8"

services:
  game-server:
    build:
      context: .
      dockerfile: Dockerfile.server
      args:
        PROJECT_NAME: MyProject
    ports:
      - "7777:7777/udp"
    restart: unless-stopped
    environment:
      - UE_MAP=DefaultMap
      - UE_MAX_PLAYERS=16
    healthcheck:
      test: ["CMD", "nc", "-uz", "localhost", "7777"]
      interval: 30s
      timeout: 5s
      retries: 3

  pixel-streaming:
    build:
      context: .
      dockerfile: Dockerfile.streaming
      args:
        PROJECT_NAME: MyProject
    ports:
      - "80:80"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu, video]
    environment:
      - RES_X=1920
      - RES_Y=1080
      - PIXEL_STREAMING_URL=ws://signaling:8888
    depends_on:
      signaling:
        condition: service_started

  signaling:
    image: ghcr.io/epicgames/pixel-streaming-signalling-server:latest
    ports:
      - "8080:8080"
      - "8888:8888"
    restart: unless-stopped
```
