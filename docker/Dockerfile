# Production multi-stage build
# Output: single Docker image where the backend serves both the API and the React frontend

# ─── Stage 1: Install all dependencies ───────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Build tools required for native modules (better-sqlite3, argon2)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
RUN npm ci

# ─── Stage 2: Build shared package ────────────────────────────────────────────
FROM deps AS shared-build
COPY packages/shared ./packages/shared
RUN npm run build -w packages/shared

# ─── Stage 3: Build React frontend (static files) ─────────────────────────────
FROM shared-build AS frontend-build
COPY packages/frontend ./packages/frontend
RUN npm run build -w packages/frontend
# Output: packages/frontend/dist/

# ─── Stage 4: Build TypeScript backend ────────────────────────────────────────
FROM shared-build AS backend-build
COPY packages/backend ./packages/backend
RUN npm run build -w packages/backend
# Output: packages/backend/dist/

# ─── Stage 5: Production runtime ──────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Install build tools, install prod-only deps (compiles native modules), then remove tools
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --omit=dev \
    && apk del .build-deps \
    && rm -rf /root/.npm

# Copy built artifacts
COPY --from=shared-build  /app/packages/shared/dist  ./packages/shared/dist
COPY --from=backend-build /app/packages/backend/dist ./packages/backend/dist

# Copy SQL migrations (read at runtime by the custom migration runner)
COPY --from=backend-build /app/packages/backend/src/db/migrations ./packages/backend/dist/db/migrations

# Copy the React build into the backend's public directory (served as static files)
COPY --from=frontend-build /app/packages/frontend/dist ./packages/backend/dist/public

# Create data directory for SQLite DB and uploads
RUN mkdir -p /data/uploads && chown node:node /data

USER node

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/data/app.db
ENV UPLOADS_PATH=/data/uploads

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

CMD ["node", "packages/backend/dist/server.js"]
