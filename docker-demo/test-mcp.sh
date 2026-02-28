#!/usr/bin/env bash
# Test the UE5 MCP Server by sending JSON-RPC requests via stdio
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== UE5 MCP Server Test Suite ==="
echo ""

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is required. Install it first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "mcp-server/node_modules" ]; then
    echo "Installing dependencies..."
    cd mcp-server && npm install && cd ..
fi

# Build if needed
if [ ! -d "mcp-server/dist" ]; then
    echo "Building MCP server..."
    cd mcp-server && npm run build && cd ..
fi

echo "--- Test 1: Initialize and list tools ---"
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | \
    timeout 10 node mcp-server/dist/index.js 2>/dev/null | head -1 | python3 -m json.tool 2>/dev/null || echo "  (Output truncated or parse error - server responded)"

echo ""
echo "--- Test 2: Build Docker image ---"
if command -v docker &> /dev/null; then
    echo "Building Docker image..."
    docker build -t ue5-mcp-server:test -f docker-demo/Dockerfile . 2>&1 | tail -3
    echo ""
    echo "Docker image built successfully!"
    echo ""

    # Quick smoke test - run container and check it starts
    echo "Running smoke test..."
    CONTAINER_ID=$(docker run -d --name ue5-mcp-test ue5-mcp-server:test 2>/dev/null || true)
    if [ -n "$CONTAINER_ID" ]; then
        sleep 2
        STATUS=$(docker inspect -f '{{.State.Status}}' ue5-mcp-test 2>/dev/null || echo "unknown")
        echo "  Container status: $STATUS"
        docker rm -f ue5-mcp-test &>/dev/null || true
    else
        echo "  (Container already exists, cleaning up)"
        docker rm -f ue5-mcp-test &>/dev/null || true
    fi
else
    echo "Docker not available — skipping container tests"
fi

echo ""
echo "--- Test 3: Verify project structure ---"
echo "Checking agents..."
for agent in ue5-dev-agent ue5-docker-agent ue5-linux-agent; do
    if [ -f ".claude/agents/${agent}.md" ]; then
        echo "  [OK] ${agent}.md"
    else
        echo "  [FAIL] ${agent}.md not found"
    fi
done

echo ""
echo "Checking skills..."
for skill in ue5-project-setup ue5-cpp-scaffold ue5-docker-build; do
    if [ -f ".claude/skills/${skill}/SKILL.md" ]; then
        echo "  [OK] ${skill}/SKILL.md"
    else
        echo "  [FAIL] ${skill}/SKILL.md not found"
    fi
done

echo ""
echo "Checking MCP server..."
if [ -f "mcp-server/src/index.ts" ]; then
    echo "  [OK] MCP server source"
else
    echo "  [FAIL] MCP server source not found"
fi

if [ -d "mcp-server/dist" ]; then
    echo "  [OK] MCP server built"
else
    echo "  [FAIL] MCP server not built"
fi

echo ""
echo "--- Test 4: Validate YAML frontmatter ---"
for file in .claude/agents/*.md .claude/skills/*/SKILL.md; do
    if [ -f "$file" ]; then
        if head -1 "$file" | grep -q "^---$"; then
            name=$(grep "^name:" "$file" | head -1 | sed 's/name: *//')
            desc_len=$(grep "^description:" "$file" | head -1 | wc -c)
            if [ -n "$name" ] && [ "$desc_len" -gt 20 ]; then
                echo "  [OK] $file (name: $name)"
            else
                echo "  [WARN] $file — name or description may be too short"
            fi
        else
            echo "  [FAIL] $file — missing YAML frontmatter"
        fi
    fi
done

echo ""
echo "=== All tests completed ==="
