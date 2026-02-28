# UE5 MCP Server - Self-contained Docker image
FROM node:22-slim AS builder

WORKDIR /app

# Copy and install dependencies
COPY mcp-server/package.json mcp-server/tsconfig.json ./
RUN npm install

# Copy source and build
COPY mcp-server/src/ ./src/
RUN npm run build

# Production stage
FROM node:22-slim

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Non-root user
RUN groupadd -r mcp && useradd -r -g mcp mcp
USER mcp

LABEL org.opencontainers.image.title="ue5-mcp-server"
LABEL org.opencontainers.image.description="MCP server for Unreal Engine 5 development assistance"
LABEL org.opencontainers.image.version="1.0.0"

ENTRYPOINT ["node", "dist/index.js"]
