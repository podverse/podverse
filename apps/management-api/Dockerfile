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
