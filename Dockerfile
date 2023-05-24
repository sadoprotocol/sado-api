FROM node:lts-alpine3.16

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY ./src ./src

RUN npm i
RUN npm run build

EXPOSE 3030

CMD DEBUG=sado-* node ./dist/main.js
