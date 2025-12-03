FROM node:18-alpine

WORKDIR /app

COPY frontend/package.json ./package.json
RUN npm install --legacy-peer-deps

COPY frontend ./

ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["npm", "start"]

