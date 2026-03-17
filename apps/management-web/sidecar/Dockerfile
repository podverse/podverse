# Stage 1: build packages and bundle sidecar (context is repo root)
FROM node:24-alpine AS builder
WORKDIR /app

COPY . .
RUN npm ci --ignore-scripts
RUN npm run build:packages
RUN npm run bundle -w @podverse/management-web-sidecar

# Stage 2: minimal runtime image with single bundled file
FROM node:24-alpine AS runner
WORKDIR /app

RUN echo '{"type":"module"}' > package.json
COPY --from=builder /app/apps/management-web/sidecar/dist/server.js ./server.js

USER node

CMD ["node", "server.js"]
