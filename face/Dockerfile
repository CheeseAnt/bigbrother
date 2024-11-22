FROM denoland/deno:2.0.6 AS build

WORKDIR /app

COPY *.json ./
COPY *.lock ./
COPY *.ts ./
COPY *.js ./

RUN deno install

COPY . .

RUN deno run build

FROM node:23.2.0-alpine

WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist dist/

CMD ["serve", "-s", "/app/dist"]
