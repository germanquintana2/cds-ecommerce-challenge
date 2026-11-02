FROM stripe/stripe-cli:v1.55.2 AS stripe
FROM oven/bun:1.2.20 AS bun
FROM node:24-bookworm-slim AS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
COPY patches ./patches
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN bun run db:generate
RUN BETTER_AUTH_SECRET=build-only-placeholder-secret-at-least-32-characters BETTER_AUTH_URL=http://localhost:3100 DATABASE_URL=postgresql://build:build@localhost:5432/build bun run build

FROM build AS runtime
COPY --from=stripe /bin/stripe /usr/local/bin/stripe
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3100
CMD ["node", "scripts/docker/run.mjs", "app"]
