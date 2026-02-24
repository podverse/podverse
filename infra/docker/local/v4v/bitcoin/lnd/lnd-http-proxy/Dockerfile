FROM node:24-slim

WORKDIR /app

COPY package.json ./
COPY proxy.js ./

EXPOSE 8181

CMD ["node", "proxy.js"]
