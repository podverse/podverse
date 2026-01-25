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
