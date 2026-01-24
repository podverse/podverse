# Plan 3f: Integration and Dockerfiles

## Overview

Final integration tasks after all applications have been migrated. Update Dockerfiles for monorepo structure, verify cross-package dependencies, and ensure all build/dev commands work correctly.

**Estimated time**: 2-3 hours

---

## Step 1: Update Dockerfiles for Monorepo

The Dockerfiles need to be updated to work within the monorepo context, using npm workspaces.

### API Dockerfile

Create `apps/api/Dockerfile`:

```dockerfile
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
```

### Workers Dockerfile

Create `apps/workers/Dockerfile`:

```dockerfile
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
```

### Web Dockerfile (multi-stage for Next.js standalone)

Create `apps/web/Dockerfile`:

```dockerfile
FROM node:22-slim AS base
WORKDIR /opt

# Stage 1: Install dependencies
FROM base AS deps
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/web/package*.json ./apps/web/

RUN npm install --workspaces

# Stage 2: Build the app
FROM deps AS builder
ENV NODE_ENV=production

COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Build packages first
RUN npm run build:packages

# Build web app
RUN npm run build -w apps/web

# Stage 3: Run the app
FROM node:22-slim AS runner
WORKDIR /opt/app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder --chown=node:node /opt/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /opt/apps/web/.next/static ./.next/static
COPY --from=builder --chown=node:node /opt/apps/web/public ./public

USER node
EXPOSE 3000

CMD ["node", "server.js"]
```

### Management API Dockerfile

Create `apps/management-api/Dockerfile`:

```dockerfile
FROM node:22-slim

WORKDIR /opt

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/management-api/ ./apps/management-api/

RUN npm install --workspaces
RUN npm run build:packages
RUN npm run build:prod -w apps/management-api

USER node

CMD ["node", "apps/management-api/dist/index.js"]
```

### Management Web Dockerfile

Create `apps/management-web/Dockerfile`:

```dockerfile
FROM node:22-slim AS base
WORKDIR /opt

FROM base AS deps
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/management-web/package*.json ./apps/management-web/

RUN npm install --workspaces

FROM deps AS builder
ENV NODE_ENV=production

COPY packages/ ./packages/
COPY apps/management-web/ ./apps/management-web/

RUN npm run build:packages
RUN npm run build -w apps/management-web

FROM node:22-slim AS runner
WORKDIR /opt/app
ENV NODE_ENV=production
ENV PORT=3999

COPY --from=builder --chown=node:node /opt/apps/management-web/.next/standalone ./
COPY --from=builder --chown=node:node /opt/apps/management-web/.next/static ./.next/static
COPY --from=builder --chown=node:node /opt/apps/management-web/public ./public

USER node
EXPOSE 3999

CMD ["node", "server.js"]
```

---

## Step 2: Create Environment Templates

Create environment templates in `infra/config/env-templates/`:

### `infra/config/env-templates/api.env.example`

Document all required environment variables for the API.

### `infra/config/env-templates/web.env.example`

Document all required environment variables for the web app.

### `infra/config/env-templates/workers.env.example`

Document all required environment variables for workers.

### `infra/config/env-templates/management-api.env.example`

Document all required environment variables for management-api.

### `infra/config/env-templates/management-web.env.example`

Document all required environment variables for management-web.

---

## Step 3: Update Root package.json Scripts

Verify and update `package.json` scripts:

```json
{
  "scripts": {
    "prepare": "bash scripts/git-hooks/install-hooks.sh",
    "start-feature": "bash scripts/start-feature.sh",
    "complete-feature": "bash scripts/complete-feature.sh",
    "build": "npm run build --workspaces --if-present",
    "build:packages": "npm run build -w packages/helpers && npm run build -w packages/external-services && npm run build -w packages/orm && npm run build -w packages/notifications && npm run build -w packages/parser && npm run build -w packages/mq",
    "build:apps": "npm run build --workspaces --if-present --workspace=apps/api --workspace=apps/web --workspace=apps/workers --workspace=apps/management-api --workspace=apps/management-web",
    "clean": "npm run clean --workspaces --if-present",
    "dev:api": "npm run dev -w apps/api",
    "dev:web": "npm run dev -w apps/web",
    "dev:workers": "npm run dev -w apps/workers",
    "dev:management-api": "npm run dev -w apps/management-api",
    "dev:management-web": "npm run dev -w apps/management-web",
    "lint": "npm run lint --workspaces --if-present",
    "lint:fix": "npm run lint:fix --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "type-check": "npm run type-check --workspaces --if-present"
  }
}
```

---

## Step 4: Verify Cross-Package Imports

Test that all apps correctly import from workspace packages:

```bash
# Build all packages
npm run build:packages

# Build all apps
npm run build:apps
```

Verify each app can import from:
- `@podverse/helpers`
- `@podverse/orm`
- `@podverse/external-services`
- `@podverse/mq`
- `@podverse/notifications`
- `@podverse/parser`

---

## Step 5: Test Concurrent Dev Servers

Verify multiple dev servers can run simultaneously:

```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev:web

# Terminal 3
npm run dev:management-api

# Terminal 4
npm run dev:management-web
```

Verify no port conflicts (configure different ports as needed):
- API: default port from .env
- Web: 3000
- Management API: from .env
- Management Web: 3999

---

## Step 6: Test Docker Builds

Build and test each Docker image:

```bash
# Build API
docker build -f apps/api/Dockerfile -t podverse-api .

# Build Web
docker build -f apps/web/Dockerfile -t podverse-web .

# Build Workers
docker build -f apps/workers/Dockerfile -t podverse-workers .

# Build Management API
docker build -f apps/management-api/Dockerfile -t podverse-management-api .

# Build Management Web
docker build -f apps/management-web/Dockerfile -t podverse-management-web .
```

---

## Step 7: Update Documentation

Create/update migration documentation:

### `docs/monorepo-migration.md`

Document:
- Migration completed
- New project structure
- How to run applications
- How to add new packages/apps
- Breaking changes (if any)

---

## Verification Checklist

### Build Verification
- [ ] `npm run build:packages` succeeds
- [ ] `npm run build:apps` succeeds
- [ ] `npm run build` (all workspaces) succeeds

### Lint Verification
- [ ] `npm run lint` passes for all workspaces

### Type Check Verification
- [ ] `npm run type-check` passes for all workspaces

### Dev Server Verification
- [ ] `npm run dev:api` starts successfully
- [ ] `npm run dev:web` starts successfully
- [ ] `npm run dev:workers` (individual commands work)
- [ ] `npm run dev:management-api` starts successfully
- [ ] `npm run dev:management-web` starts successfully

### Docker Verification
- [ ] API Docker image builds
- [ ] Web Docker image builds
- [ ] Workers Docker image builds
- [ ] Management API Docker image builds
- [ ] Management Web Docker image builds

### Runtime Verification
- [ ] API responds to requests
- [ ] Web pages load correctly
- [ ] Worker commands execute
- [ ] Management API responds to requests
- [ ] Management Web pages load correctly

---

## Final Project Structure

```
podverse/
├── package.json                 # Root workspace config
├── tsconfig.base.json           # Shared TypeScript config
├── eslint.config.mjs            # Shared ESLint config
├── apps/
│   ├── api/                     # API server
│   ├── management-api/          # Management API server
│   ├── management-web/          # Management Next.js app
│   ├── web/                     # Main Next.js app
│   └── workers/                 # Background workers
├── packages/
│   ├── external-services/       # External API integrations
│   ├── helpers/                 # Shared utilities
│   ├── mq/                      # Message queue utilities
│   ├── notifications/           # Push notification services
│   ├── orm/                     # TypeORM entities/services
│   └── parser/                  # RSS parser
├── infra/
│   ├── config/
│   │   └── env-templates/       # Environment variable templates
│   ├── database/                # Database scripts
│   ├── docker/                  # Docker compose files
│   └── proxy/                   # Proxy configuration
├── docs/                        # Documentation
├── scripts/                     # Build/dev scripts
└── tools/                       # Development tools
```

---

## Migration Complete

After this plan is executed, the monorepo migration is complete. All 6 packages and 5 applications have been migrated to the unified monorepo structure.
