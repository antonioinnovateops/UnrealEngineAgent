#!/usr/bin/env bash
# Install Unreal Engine 5.7 inside the Docker container
# Run this INSIDE the ue5-editor container after launch.sh shell
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

UE_ROOT="$HOME/UnrealEngine"

echo ""
echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN} UE5 Engine Installation${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""

# Check if already installed
if [ -f "$UE_ROOT/Engine/Binaries/Linux/UnrealEditor" ]; then
    ok "UE5 already installed at $UE_ROOT"
    echo "  Version: $(cat $UE_ROOT/Engine/Build/Build.version 2>/dev/null | python3 -c 'import json,sys; v=json.load(sys.stdin); print(f"{v["MajorVersion"]}.{v["MinorVersion"]}.{v["PatchVersion"]}")' 2>/dev/null || echo 'unknown')"
    exit 0
fi

echo "Choose installation method:"
echo ""
echo "  1) Clone from GitHub source (requires Epic Games account linked to GitHub)"
echo "     - Full source access, can modify engine"
echo "     - Build time: 4-5 hours, ~500GB disk"
echo ""
echo "  2) Download pre-built binaries"
echo "     - Faster setup (~25GB download)"
echo "     - No source modification"
echo ""
read -p "Select [1/2]: " METHOD

case "$METHOD" in
    1)
        info "Installing from source..."

        # Check GitHub access
        if ! ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
            warn "GitHub SSH authentication failed"
            echo "You need:"
            echo "  1. An Epic Games account linked to GitHub"
            echo "  2. SSH key configured for GitHub"
            echo ""
            echo "Link account: https://www.unrealengine.com/en-US/ue-on-github"
            echo "Then mount your SSH keys: -v $HOME/.ssh:/home/ue5dev/.ssh:ro"
            exit 1
        fi

        info "Cloning UE5 repository (this will take a while)..."
        git clone --depth 1 git@github.com:EpicGames/UnrealEngine.git "$UE_ROOT"

        cd "$UE_ROOT"

        info "Running Setup.sh..."
        ./Setup.sh

        info "Generating project files..."
        ./GenerateProjectFiles.sh

        info "Building engine (this takes 4-5 hours)..."
        export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
        ./Engine/Build/BatchFiles/Linux/Build.sh UnrealEditor Linux Development -j$(nproc)

        ok "UE5 built from source!"
        ;;

    2)
        info "Download pre-built binaries"
        echo ""
        echo "Pre-built Linux binaries are available from:"
        echo "  https://www.unrealengine.com/en-US/linux"
        echo ""
        echo "After downloading, extract to: $UE_ROOT"
        echo ""
        echo "Example:"
        echo "  wget -O /tmp/ue5.tar.gz 'YOUR_DOWNLOAD_URL'"
        echo "  mkdir -p $UE_ROOT"
        echo "  tar xzf /tmp/ue5.tar.gz -C $UE_ROOT --strip-components=1"
        echo ""
        warn "Automated download is not possible — Epic requires login"
        ;;

    *)
        error "Invalid selection"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN} Post-Installation Steps${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "1. Test the editor:     ue5-editor"
echo "2. Check Vulkan:        vulkaninfo --summary"
echo "3. Create a project:    Use the ue5-project-setup skill"
echo "4. Start MCP:           mcp-start"
echo ""
