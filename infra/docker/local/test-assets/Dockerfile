# Local use only; this image is not published. Build from repo root:
#   docker build -f infra/docker/local/test-assets/Dockerfile -t podverse-test-assets:latest .
# Single-stage for simplicity. Serves tools/test-assets at http://0.0.0.0:2111.

FROM node:24-slim
WORKDIR /opt

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY tools/test-assets/ ./tools/test-assets/
COPY scripts/ci/ ./scripts/ci/

RUN npm ci --ignore-scripts && npm run build:packages:prod && npm run build -w tools/test-assets

ENV BIND_ADDRESS=0.0.0.0
EXPOSE 2111
CMD ["node", "tools/test-assets/dist/serve.js"]
