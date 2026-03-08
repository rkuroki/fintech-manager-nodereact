# Investor Management Backoffice Platform

A professional enterprise backoffice for managing investors and customers, built with Node.js, React, and SQLite.

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + TypeScript + Fastify |
| Database | SQLite (via Drizzle ORM + better-sqlite3) |
| Frontend | React + Vite + Ant Design Pro |
| Auth | JWT (8h sessions) + argon2id passwords |
| Encryption | AES-256-GCM for sensitive fields at rest |
| Testing | Vitest + MSW + Playwright |
| Deployment | Single Docker image |

---

## Quick Start (Development)

**One command starts everything:**

```bash
docker-compose up
```

| Service | URL |
|---|---|
| Frontend (Vite HMR) | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| API Documentation (Swagger) | http://localhost:3001/docs |

### Development Seed Accounts

| Email | Password | Role |
|---|---|---|
| `admin@example.com` | `Admin123!` | Admin (full access) |
| `manager@example.com` | `Manager123!` | Manager (customer + sensitive data) |
| `analyst@example.com` | `Analyst123!` | Analyst (read-only customers) |

---

## Local Development (Without Docker)

Prerequisites: Node.js 20+, npm 10+

```bash
# Install dependencies
npm install

# Copy and configure environment
cp packages/backend/.env.example packages/backend/.env
# Edit .env: set JWT_SECRET and ENCRYPTION_KEY

# Start backend + frontend concurrently with hot reload
npm run dev:local

# Or start individually:
npm run dev -w packages/backend   # port 3001
npm run dev -w packages/frontend  # port 5173
```

---

## Environment Variables

All variables are in `packages/backend/.env.example`. Copy to `packages/backend/.env` for local development.

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development` \| `production` \| `test` (default: `development`) |
| `PORT` | No | Server port (default: `3001`) |
| `DATABASE_PATH` | No | SQLite file path (default: `./data/dev.db`, use `:memory:` for tests) |
| `JWT_SECRET` | **Yes** | At least 32 characters. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `ENCRYPTION_KEY` | **Yes** | Exactly 64 hex chars (32 bytes). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `UPLOADS_PATH` | No | Directory for uploaded files (default: `./data/uploads`) |
| `SEED_DB` | No | Set to `true` to seed dev data on startup (development only) |

---

## Commands

```bash
# Development
npm run dev              # Start with Docker (recommended)
npm run dev:local        # Start without Docker (hot reload)

# Testing
npm run test             # Run all tests
npm run test:e2e         # Run Playwright E2E tests

# Database
npm run db:generate      # Generate new migration after schema change
npm run db:migrate       # Apply pending migrations
npm run db:seed          # Seed development data
npm run db:studio        # Open Drizzle Studio (DB browser)

# Type checking
npm run typecheck        # Check all packages

# Packaging
npm run package          # Build production Docker image: investor-backoffice:latest
```

---

## Production Deployment

### Build the image

```bash
npm run package
# or: docker build -f docker/Dockerfile -t investor-backoffice:latest .
```

### Run anywhere

```bash
docker run -p 8080:8080 \
  -v ./data:/data \
  -e JWT_SECRET="<64-char-random-string>" \
  -e ENCRYPTION_KEY="<64-char-random-hex>" \
  investor-backoffice:latest
```

The single image serves both the React frontend (at `/`) and the REST API (at `/api`).

### Using docker-compose (production reference)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

See `docker-compose.prod.yml` for the full configuration.

---

## Architecture

```
investor-backoffice/
├── packages/
│   ├── shared/       # Shared TypeScript types, Zod schemas, PERMISSIONS constants
│   ├── backend/      # Fastify API server
│   │   └── src/
│   │       ├── db/          # Drizzle schema, migrations, seeds
│   │       ├── domains/     # Feature-sliced: auth, users, customers, audit
│   │       ├── plugins/     # Fastify plugins: auth, rbac, audit, swagger
│   │       └── utils/       # crypto, password, pagination, errors, mnemonic
│   └── frontend/     # React + Vite + Ant Design
│       └── src/
│           ├── api/         # Axios API clients
│           ├── components/  # SensitiveField, AppLayout, ConfirmModal
│           ├── pages/       # Login, Dashboard, Users, Customers, Audit
│           ├── router/      # Routes + PrivateRoute/RoleGuard
│           └── store/       # Zustand: auth + ui
├── docker/
│   ├── Dockerfile      # Production multi-stage (single image)
│   └── Dockerfile.dev  # Development image
└── docker-compose.yml  # Development environment
```

### Key Design Decisions

**Sensitive field encryption**: Customer fields (Tax ID, address, bank details) are encrypted individually with AES-256-GCM (unique IV per value, stored as base64). The `ENCRYPTION_KEY` never enters the database or source code. Non-authorized users never receive encrypted column values — they are stripped before the response is sent.

**Audit log immutability**: The `audit_log` table has SQLite triggers that abort any `UPDATE` or `DELETE` statement. The application layer also has no delete path for this table.

**RBAC**: Every protected route has a `preHandler` that resolves fresh permissions from the database per request. Roles are never cached in the JWT to prevent stale permission grants.

**Single-image deployment**: The production Dockerfile builds frontend and backend separately, then copies the React `dist/` into the backend's `public/` directory. The backend serves static files and falls back to `index.html` for non-API routes.

---

## Access Control

| Role | Users | Groups | Customers | Sensitive Data | Audit |
|---|---|---|---|---|---|
| Admin | Full CRUD | Full CRUD | Full CRUD | Yes | Yes |
| Manager | — | — | Read/Write | Yes | Yes |
| Analyst | — | — | Read-only | No | No |

Admins can create custom roles with any combination of permissions from `packages/shared/src/constants/permissions.ts`.

---

## Data & Privacy

- **No data is permanently deleted** — all entities use soft deletes (`deleted_at` timestamp)
- **Sensitive customer data** is encrypted at rest with AES-256-GCM
- **Audit logs** record every create/update/delete action with before/after values
- **Sensitive field plaintext never appears in audit logs** — shown as `[ENCRYPTED]`
- **Passwords** are hashed with argon2id (OWASP recommended, resistant to GPU attacks)

---

## Testing

```bash
# All backend tests (Vitest, in-memory SQLite)
npm run test -w packages/backend

# All frontend tests (Vitest + React Testing Library + MSW)
npm run test -w packages/frontend

# E2E tests against running dev server (Playwright)
npm run test:e2e

# Watch mode (during development)
npm run test:watch -w packages/backend
npm run test:watch -w packages/frontend
```

Coverage targets: 100% lines/branches/functions for both backend and frontend (seeds and migrations excluded).

---

## API Documentation

The auto-generated Swagger UI is available at `http://localhost:3001/docs` in development mode. It is automatically disabled in production.
