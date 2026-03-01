#!/usr/bin/env bash
# Launch UE5 Development Environment with X11 forwarding
# Usage: ./launch.sh [command]
#   ./launch.sh           - Start interactive shell
#   ./launch.sh editor    - Start UE5 Editor directly
#   ./launch.sh mcp       - Start MCP server only
#   ./launch.sh test-x11  - Test X11 forwarding with xeyes
#   ./launch.sh build     - Build the Docker image only
#   ./launch.sh down      - Stop and remove containers
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# --- Pre-flight checks ---

check_prerequisites() {
    info "Running pre-flight checks..."

    # Docker
    if ! command -v docker &>/dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    ok "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+')"

    # NVIDIA Container Toolkit
    if ! docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi &>/dev/null 2>&1; then
        warn "NVIDIA Container Toolkit not working - GPU passthrough may fail"
        warn "Install: sudo apt install nvidia-container-toolkit && sudo systemctl restart docker"
    else
        ok "NVIDIA Container Toolkit working"
    fi

    # X11 display
    if [ -z "${DISPLAY:-}" ]; then
        # Try to detect display
        if [ -S /tmp/.X11-unix/X1 ]; then
            export DISPLAY=:1
            warn "DISPLAY was empty, set to :1"
        elif [ -S /tmp/.X11-unix/X0 ]; then
            export DISPLAY=:0
            warn "DISPLAY was empty, set to :0"
        else
            error "No DISPLAY set and no X11 sockets found"
            error "Make sure you're running from a graphical session"
            exit 1
        fi
    fi
    ok "X11 display: $DISPLAY"

    # Xauthority
    if [ -z "${XAUTHORITY:-}" ]; then
        export XAUTHORITY="$HOME/.Xauthority"
    fi
    if [ ! -f "$XAUTHORITY" ]; then
        warn "Xauthority file not found at $XAUTHORITY"
        warn "Creating temporary xauth..."
        touch "$XAUTHORITY"
        xauth generate "$DISPLAY" . trusted 2>/dev/null || true
    fi
    ok "Xauthority: $XAUTHORITY"
}

setup_x11_access() {
    info "Configuring X11 access for Docker..."

    # Allow local connections (safe for dev environments)
    xhost +local:docker 2>/dev/null || true
    xhost +SI:localuser:root 2>/dev/null || true

    ok "X11 access granted to Docker containers"
}

# --- Export environment for docker-compose ---

export_env() {
    export HOST_UID=$(id -u)
    export HOST_GID=$(id -g)
    export DISPLAY="${DISPLAY}"
    export XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"
    export USER="${USER}"

    # Auto-detect NVIDIA driver version for Vulkan library bind-mounts
    NVIDIA_DRIVER_VERSION=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1 || true)
    if [ -n "$NVIDIA_DRIVER_VERSION" ]; then
        export NVIDIA_DRIVER_VERSION
        ok "NVIDIA driver: $NVIDIA_DRIVER_VERSION"
    else
        warn "Could not detect NVIDIA driver version - Vulkan GPU support may not work"
        export NVIDIA_DRIVER_VERSION="000.00.00"
    fi
}

# Auto-detect docker compose command
if command -v docker-compose &>/dev/null; then
    DC="docker-compose"
elif docker compose version &>/dev/null 2>&1; then
    DC="docker compose"
else
    error "Neither 'docker compose' nor 'docker-compose' found"
    exit 1
fi

# --- Commands ---

cmd_build() {
    info "Building UE5 development image..."
    cd "$SCRIPT_DIR"
    $DC build --build-arg HOST_UID=$(id -u) --build-arg HOST_GID=$(id -g)
    ok "Image built successfully"
}

cmd_shell() {
    check_prerequisites
    setup_x11_access
    export_env

    info "Starting UE5 development environment..."
    cd "$SCRIPT_DIR"
    $DC up -d ue5-editor ue5-mcp

    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN} UE5 Dev Environment Ready${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    echo "  Display:    $DISPLAY (X11 forwarded)"
    echo "  GPU:        $(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo 'unknown')"
    echo "  MCP Server: Running in ue5-mcp container"
    echo ""
    echo "  Quick commands inside container:"
    echo "    xeyes              # Test X11"
    echo "    glxgears            # Test OpenGL"
    echo "    vulkaninfo --summary # Test Vulkan"
    echo "    ue5-editor          # Launch Unreal Editor"
    echo "    mcp-start           # Start MCP server"
    echo ""

    $DC exec ue5-editor bash
}

cmd_test_x11() {
    check_prerequisites
    setup_x11_access
    export_env

    info "Testing X11 forwarding..."
    cd "$SCRIPT_DIR"
    $DC up -d ue5-editor

    echo ""
    info "Launching xeyes (close the window to continue)..."
    $DC exec ue5-editor xeyes || true

    info "Testing OpenGL with glxgears..."
    timeout 5 $DC exec ue5-editor glxgears -info 2>&1 | head -5 || true

    info "Checking Vulkan..."
    $DC exec ue5-editor vulkaninfo --summary 2>&1 | head -20 || warn "Vulkan not available"

    info "Checking GPU..."
    $DC exec ue5-editor nvidia-smi 2>&1 | head -15 || warn "nvidia-smi not available"

    ok "X11 tests complete"
}

cmd_mcp() {
    export_env
    cd "$SCRIPT_DIR"

    info "Starting MCP server..."
    $DC up -d ue5-mcp
    ok "MCP server running in container ue5-mcp"
    echo ""
    echo "  Connect via: docker exec -i ue5-mcp node dist/index.js"
    echo ""
    echo "  Or add to Claude Code settings:"
    echo '  "mcpServers": {'
    echo '    "ue5": {'
    echo '      "command": "docker",'
    echo '      "args": ["exec", "-i", "ue5-mcp", "node", "dist/index.js"]'
    echo '    }'
    echo '  }'
}

cmd_down() {
    cd "$SCRIPT_DIR"
    info "Stopping containers..."
    $DC down
    # Revoke X11 access
    xhost -local:docker 2>/dev/null || true
    ok "Environment stopped"
}

cmd_editor() {
    check_prerequisites
    setup_x11_access
    export_env

    info "Launching UE5 Editor..."
    cd "$SCRIPT_DIR"
    $DC up -d ue5-editor ue5-mcp
    $DC exec ue5-editor bash -c 'ue5-editor || echo "UE5 Editor not installed yet. Run: ./install-ue5.sh"'
}

# --- Main ---

case "${1:-shell}" in
    build)    cmd_build ;;
    shell)    cmd_shell ;;
    editor)   cmd_editor ;;
    mcp)      cmd_mcp ;;
    test-x11) cmd_test_x11 ;;
    down)     cmd_down ;;
    *)
        echo "Usage: $0 {shell|editor|mcp|test-x11|build|down}"
        echo ""
        echo "  shell     Start interactive dev shell (default)"
        echo "  editor    Launch UE5 Editor with X11"
        echo "  mcp       Start MCP server only"
        echo "  test-x11  Test X11 forwarding (xeyes, glxgears, vulkan)"
        echo "  build     Build Docker image"
        echo "  down      Stop all containers"
        exit 1
        ;;
esac
