FROM node:24-slim AS base
WORKDIR /opt

# Build argument for environment file path (optional)
# - For deploy images: pass ENV_FILE=apps/management-web/env/alpha.env to bake in env vars
# - For base images: omit ENV_FILE, app uses runtime environment variables
ARG ENV_FILE=

# Stage 1: Install dependencies
FROM base AS deps
COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/management-web/package*.json ./apps/management-web/

# Install all dependencies (devDependencies like @types/* needed for TypeScript compilation)
# --ignore-scripts skips the prepare script that tries to install git hooks
RUN npm install --ignore-scripts

# Stage 2: Build the app
FROM deps AS builder
# Redeclare ARG so it's available in this stage
ARG ENV_FILE
ENV NODE_ENV=production

COPY packages/ ./packages/
COPY apps/management-web/ ./apps/management-web/

# Conditionally copy env file if provided (for deploy images)
# ENV_FILE path is relative to build context and exists in copied app folder
RUN if [ -n "${ENV_FILE}" ]; then cp "${ENV_FILE}" apps/management-web/.env.production; fi

COPY scripts/ci/ ./scripts/ci/

# Build packages (prod = TypeScript only, no linting)
RUN npm run build:packages:prod

# Build management-web app
RUN npm run build -w apps/management-web

# Stage 3: Run the app
FROM node:24-slim AS runner
WORKDIR /opt/app
ENV NODE_ENV=production
ENV PORT=3999

COPY --from=builder --chown=node:node /opt/apps/management-web/.next/standalone ./
COPY --from=builder --chown=node:node /opt/apps/management-web/.next/static ./apps/management-web/.next/static
COPY --from=builder --chown=node:node /opt/apps/management-web/public ./apps/management-web/public

USER node
EXPOSE 3999

CMD ["node", "apps/management-web/server.js"]
