# -- Stage: base --
FROM node:22.13-bookworm-slim AS base
ARG APP_COMMIT=unknown
ENV APP_COMMIT=$APP_COMMIT
# Pin pnpm to the lockfile's version for deterministic installs.
RUN npm install --global pnpm@10.33.2
WORKDIR /app

# -- Stage: deps --
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile --ignore-scripts \
    && pnpm rebuild esbuild sharp

# -- Stage: slidev-deps --
FROM base AS slidev-deps
COPY slidev-workspace/package.json slidev-workspace/pnpm-lock.yaml ./slidev-workspace/
WORKDIR /app/slidev-workspace
RUN pnpm install --frozen-lockfile

# -- Stage: builder --
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Payload needs these at build time for config compilation (values don't matter)
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV PAYLOAD_SECRET=build-time-secret-not-used-at-runtime
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm generate:types \
    && test -f src/payload-types.ts \
    && pnpm generate:importmap \
    && pnpm build

# -- Stage: production --
FROM node:22.13-bookworm-slim AS production
ARG APP_COMMIT=unknown
ENV APP_COMMIT=$APP_COMMIT

# Install Playwright Chromium system dependencies + fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxfixes3 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    fonts-noto fonts-noto-cjk fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Pin pnpm to the lockfile's version for deterministic installs.
RUN npm install --global pnpm@10.33.2
WORKDIR /app

# Copy built Next.js app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/public ./public

# Copy Payload source and operational scripts needed at runtime
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts

# Copy Slidev workspace with its own node_modules
COPY --from=slidev-deps /app/slidev-workspace/node_modules ./slidev-workspace/node_modules
COPY slidev-workspace/package.json ./slidev-workspace/

# Install the exact Playwright Chromium revision required by the isolated
# Slidev workspace. Running `npx playwright-chromium` from /app can resolve the
# root dependency tree instead, leaving Slidev looking for a different revision.
RUN pnpm --dir slidev-workspace exec playwright install chromium

# Create media directory for shared volume
RUN mkdir -p /app/media

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "start"]
