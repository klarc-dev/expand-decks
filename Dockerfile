# -- Stage: base --
FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# -- Stage: deps --
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -- Stage: slidev-deps --
FROM base AS slidev-deps
COPY slidev-workspace/package.json ./slidev-workspace/
WORKDIR /app/slidev-workspace
RUN pnpm install

# -- Stage: builder --
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Payload needs these at build time for config compilation (values don't matter)
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV PAYLOAD_SECRET=build-time-secret-not-used-at-runtime
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm payload generate:importmap && pnpm build

# -- Stage: production --
FROM node:20-bookworm-slim AS production

# Install Playwright Chromium system dependencies + fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    fonts-noto fonts-noto-cjk fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy built Next.js app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# Copy Payload source (needed at runtime for collections/config)
COPY --from=builder /app/src ./src

# Copy Slidev workspace with its own node_modules
COPY --from=slidev-deps /app/slidev-workspace/node_modules ./slidev-workspace/node_modules
COPY slidev-workspace/package.json ./slidev-workspace/

# Install Playwright Chromium browser binary
RUN npx playwright-chromium install chromium

# Create media directory for shared volume
RUN mkdir -p /app/media

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "start"]
