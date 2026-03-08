# TASK-001: Docker SQLite Persistence + DBeaver Access

## Problem
The `docker-compose.yml` already bind-mounts `./data:/app/data`, but:
- The seed runs on every startup (`SEED_DB: "true"`) using `INSERT OR IGNORE`, so existing data is preserved — the real issue is the SQLite file lives inside `./data/` which may be gitignored or not obvious.
- DBeaver needs a **stable, accessible host path** to the `.db` file.

## Changes

### 1. Ensure `data/` directory exists in repo
- Create `data/.gitkeep` so the directory is tracked by git
- Update `.gitignore` to ignore DB files but keep the folder:
  ```
  data/*
  !data/.gitkeep
  ```

### 2. docker-compose.yml
No volume change needed — bind-mount `./data:/app/data` already works and persists data across `docker compose stop/start/down/up`.

### 3. DBeaver Connection
The SQLite file path on the host is: `<project-root>/data/dev.db`

DBeaver connects to it as a local SQLite file:
- Driver: SQLite
- Path: `C:\Users\renan\workspace\claude\fullstack-js-crud-sample\data\dev.db`

**Important — SQLite locking**:
- WAL mode is enabled, allowing concurrent reads
- Best practice: stop Docker backend before opening in DBeaver for write access
- Read-only access works while the app is running

## Files to Change
| File | Action |
|---|---|
| `data/.gitkeep` | Create (empty file) |
| `.gitignore` | Add `data/*` and `!data/.gitkeep` rules |

## Verification
1. `docker compose up -d` → create a customer via UI
2. `docker compose down` → `docker compose up -d` → customer still exists
3. Open `data/dev.db` in DBeaver → tables and data visible
