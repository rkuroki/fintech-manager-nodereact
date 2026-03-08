# TASK-002: Backend Config — Google OAuth Env Vars

## Goal
Add optional Google OAuth2 environment variables to the backend config. Gmail features are disabled when these are not set (graceful degradation).

## Changes

### `packages/backend/src/config.ts`
Add to `ConfigSchema`:
```typescript
GOOGLE_CLIENT_ID: z.string().optional(),
GOOGLE_CLIENT_SECRET: z.string().optional(),
GOOGLE_REDIRECT_URI: z.string().url().optional().default('http://localhost:3001/api/gmail/callback'),
```

All three are optional so the app still starts without Gmail configured.

### Helper function
Add a convenience function:
```typescript
export function isGmailConfigured(): boolean {
  return !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
}
```

## Files to Change
| File | Action |
|---|---|
| `packages/backend/src/config.ts` | Add 3 optional env vars + helper function |

## Verification
- App still starts with no Google env vars (existing tests pass unchanged)
- `isGmailConfigured()` returns `false` when vars are missing
- `isGmailConfigured()` returns `true` when both are set
