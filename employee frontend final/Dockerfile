FROM node:18.20.8-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install -g npm@10.8.2

RUN npm ci

COPY . .

RUN npm run build

RUN npm install -g http-server

EXPOSE 4200

CMD ["http-server", "dist/frontend", "-p", "4200", "-a", "0.0.0.0"]
