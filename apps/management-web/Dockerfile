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
