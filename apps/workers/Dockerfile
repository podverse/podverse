FROM node:24-slim AS base
WORKDIR /opt

# Stage 1: Install dependencies
FROM base AS deps
COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/workers/package*.json ./apps/workers/

# Install all dependencies (devDependencies like @types/* needed for TypeScript compilation)
# --ignore-scripts skips the prepare script that tries to install git hooks
RUN npm install --ignore-scripts

# Stage 2: Build the app
FROM deps AS builder

COPY packages/ ./packages/
COPY apps/workers/ ./apps/workers/

# Build packages (prod = TypeScript only, no linting)
RUN npm run build:packages:prod

# Build workers (prod = TypeScript only, no linting)
RUN npm run build:prod -w apps/workers

# Stage 3: Production runner
FROM node:24-slim AS runner
WORKDIR /opt

# Copy only what's needed for runtime
COPY --from=builder /opt/package*.json ./
COPY --from=builder /opt/packages/helpers/package.json ./packages/helpers/
COPY --from=builder /opt/packages/helpers/dist/ ./packages/helpers/dist/
COPY --from=builder /opt/packages/helpers-validation/package.json ./packages/helpers-validation/
COPY --from=builder /opt/packages/helpers-validation/dist/ ./packages/helpers-validation/dist/
COPY --from=builder /opt/packages/helpers-requests/package.json ./packages/helpers-requests/
COPY --from=builder /opt/packages/helpers-requests/dist/ ./packages/helpers-requests/dist/
COPY --from=builder /opt/packages/helpers-backend/package.json ./packages/helpers-backend/
COPY --from=builder /opt/packages/helpers-backend/dist/ ./packages/helpers-backend/dist/
COPY --from=builder /opt/packages/helpers-config/package.json ./packages/helpers-config/
COPY --from=builder /opt/packages/helpers-config/dist/ ./packages/helpers-config/dist/
COPY --from=builder /opt/packages/external-services/package.json ./packages/external-services/
COPY --from=builder /opt/packages/external-services/dist/ ./packages/external-services/dist/
COPY --from=builder /opt/packages/orm/package.json ./packages/orm/
COPY --from=builder /opt/packages/orm/dist/ ./packages/orm/dist/
COPY --from=builder /opt/packages/notifications/package.json ./packages/notifications/
COPY --from=builder /opt/packages/notifications/dist/ ./packages/notifications/dist/
COPY --from=builder /opt/packages/parser/package.json ./packages/parser/
COPY --from=builder /opt/packages/parser/dist/ ./packages/parser/dist/
COPY --from=builder /opt/packages/mq/package.json ./packages/mq/
COPY --from=builder /opt/packages/mq/dist/ ./packages/mq/dist/
COPY --from=builder /opt/apps/workers/package.json ./apps/workers/
COPY --from=builder /opt/apps/workers/dist/ ./apps/workers/dist/

# Install production dependencies only
RUN npm install --workspaces --omit=dev --ignore-scripts

USER node
