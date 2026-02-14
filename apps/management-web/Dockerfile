# Base image: published as management-web-base by Alpha workflow, or use default for local builds.
ARG BASE_IMAGE=ghcr.io/podverse/podverse/management-web-base:alpha

# Stage 1 (deps) is the published base image. Stage 2: Build the app.
FROM ${BASE_IMAGE} AS builder
ENV NODE_ENV=production

COPY packages/ ./packages/
COPY apps/management-web/ ./apps/management-web/

COPY scripts/ci/ ./scripts/ci/

# Build packages (prod = TypeScript only, no linting)
RUN npm run build:packages:prod

# Build management-web app
RUN npm run build -w apps/management-web

# Stage 3: Run the app
FROM node:24-slim AS runner
WORKDIR /opt/app
ENV NODE_ENV=production
ENV PORT=3100

COPY --from=builder --chown=node:node /opt/apps/management-web/.next/standalone ./
COPY --from=builder --chown=node:node /opt/apps/management-web/.next/static ./apps/management-web/.next/static
COPY --from=builder --chown=node:node /opt/apps/management-web/public ./apps/management-web/public

USER node
EXPOSE 3100

CMD ["node", "apps/management-web/server.js"]
