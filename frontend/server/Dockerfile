FROM node:18-alpine

WORKDIR /app

COPY frontend/server/package.json ./package.json
RUN npm install --production

COPY frontend/server ./

EXPOSE 4001

CMD ["node", "index.js"]

