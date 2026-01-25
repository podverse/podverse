FROM node:22-slim

WORKDIR /opt

# Copy root package files for workspace setup
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/workers/ ./apps/workers/

# Install all dependencies (workspaces)
RUN npm install --workspaces

# Build packages in order
RUN npm run build:packages

# Build workers
RUN npm run build -w apps/workers

RUN chown -R node:node /opt || true
USER node
