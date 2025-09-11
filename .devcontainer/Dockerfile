# Use the official Node.js 22 image
FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

# Install pnpm and development tools globally using npm
# npm으로 pnpm과 개발 도구들을 글로벌 설치 (가장 간단하고 안정적)
RUN npm install -g pnpm@latest @nestjs/cli prisma

# Set the working directory
WORKDIR /workspace/otto-handler

# Add a health check to ensure container is running properly
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Container is healthy')" || exit 1

# The devcontainer features will handle user creation and additional tool installation
