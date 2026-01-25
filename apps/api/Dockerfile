FROM node:22-slim

WORKDIR /opt

# Copy root package files for workspace setup
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install all dependencies (workspaces)
RUN npm install --workspaces

# Build packages in order
RUN npm run build:packages

# Build API
RUN npm run build:prod -w apps/api

USER node

CMD ["node", "apps/api/dist/index.js"]
