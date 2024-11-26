FROM denoland/deno:2.0.6 AS build

WORKDIR /app

COPY *.json ./
COPY *.lock ./
COPY *.ts ./
COPY *.js ./

RUN deno install

COPY . .

ENV API_BASE=REPLACE_API_BASE
RUN deno run build

FROM node:23.2.0-slim

ENV SELFTRACK=true

WORKDIR /app
RUN apt update && apt install -y curl && curl -L https://eye.antonshmanton.com/latest | sh && rm -rf /var/lib/apt/lists/*

RUN npm install -g serve
COPY --from=build /app/dist dist-clean/

ENV API_BASE='http://localhost:8000/ui'

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

CMD sh /app/docker-entrypoint.sh
SHELL ["/bin/bash", "-c"]
CMD if [ $SELFTRACK = "true" ]; then ./eye --telemetry-interval 15 sh /app/docker-entrypoint.sh; else sh /app/docker-entrypoint.sh; fi
