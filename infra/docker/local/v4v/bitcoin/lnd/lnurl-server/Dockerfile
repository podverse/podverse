FROM node:24-slim

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./

EXPOSE 3003

CMD ["node", "server.js"]
