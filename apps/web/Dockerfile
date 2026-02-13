# Base image: published as web-base by Alpha workflow, or use default for local builds.
ARG BASE_IMAGE=ghcr.io/podverse/podverse/web-base:alpha

# Build argument for environment file path (optional)
# - For deploy images: pass ENV_FILE=apps/web/env/alpha.env to bake in env vars
# - For base images: omit ENV_FILE, app uses runtime environment variables
ARG ENV_FILE=

# Stage 1 (deps) is the published base image. Stage 2: Build the app.
FROM ${BASE_IMAGE} AS builder
ARG ENV_FILE
ENV NODE_ENV=production

COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Conditionally copy env file if provided (for deploy images)
# ENV_FILE path is relative to build context and exists in copied app folder
RUN if [ -n "${ENV_FILE}" ]; then cp "${ENV_FILE}" apps/web/.env.production; fi

COPY scripts/ci/ ./scripts/ci/

# Build packages (prod = TypeScript only, no linting)
RUN npm run build:packages:prod

# Build web app
RUN npm run build -w apps/web

# Stage 3: Run the app
FROM node:24-slim AS runner
WORKDIR /opt/app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder --chown=node:node /opt/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /opt/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /opt/apps/web/public ./apps/web/public

USER node
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
