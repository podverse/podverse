# Build context: monorepo root
FROM otel/opentelemetry-collector-contrib:0.120.1 AS otelcol

FROM node:24-alpine AS builder
WORKDIR /app

COPY . .
RUN npm ci --ignore-scripts
RUN npm run bundle -w @podverse/extension-prometheus

FROM node:24-alpine AS runner
WORKDIR /app

RUN echo '{"type":"module"}' > package.json
COPY --from=builder /app/extensions/prometheus/dist/server.js ./server.js
COPY --from=otelcol /otelcol-contrib /usr/local/bin/otelcol-contrib

USER node

EXPOSE 9464
EXPOSE 4318

CMD ["node", "server.js"]
