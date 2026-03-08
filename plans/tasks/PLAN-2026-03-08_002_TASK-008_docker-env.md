# TASK-008: Docker & Environment Setup

## Goal
Add optional Google OAuth environment variables to docker-compose and env example files. Gmail features are disabled when vars are not set.

## Changes

### 1. `docker-compose.yml`
Add optional env vars to backend service:
```yaml
environment:
  # ... existing vars ...
  GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
  GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
  GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI:-http://localhost:3001/api/gmail/callback}
```

### 2. `.env.example` (or create if not exists)
```env
# ... existing vars ...

# Gmail Integration (optional — leave blank to disable Gmail features)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/gmail/callback
```

### 3. `docker-compose.prod.yml`
Same pattern as dev compose — pass through env vars.

## Files to Change
| File | Action |
|---|---|
| `docker-compose.yml` | Add 3 optional Google env vars |
| `docker-compose.prod.yml` | Add 3 optional Google env vars |
| `.env.example` | Add Google env vars with documentation |

## Verification
- `docker compose up` works without Google env vars (Gmail features disabled)
- `docker compose up` works with Google env vars set (Gmail features enabled)
- No breaking changes to existing setup
