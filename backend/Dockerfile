FROM node:22-slim AS builder

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-slim

ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/public
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/src ./src
COPY public ./public

EXPOSE 3000
CMD ["node", "src/server.js"]
