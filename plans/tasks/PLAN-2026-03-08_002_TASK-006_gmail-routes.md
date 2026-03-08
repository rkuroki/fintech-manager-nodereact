# TASK-006: Gmail Domain — Routes + App Registration

## Goal
Create HTTP routes for the Gmail domain and register them in the Fastify app. Follows the existing route pattern from `customers.routes.ts`.

## Changes

### 1. `packages/backend/src/domains/gmail/gmail.routes.ts` (NEW)

All routes require authentication except the OAuth callback.

| Method | Path | Permission | Handler |
|---|---|---|---|
| `GET` | `/status` | `GMAIL_CONNECT` | Return user's Gmail connection status |
| `GET` | `/auth` | `GMAIL_CONNECT` | Return Google OAuth2 consent URL |
| `GET` | `/callback` | *(no auth — public)* | Handle OAuth2 callback, exchange code for tokens, redirect to frontend |
| `DELETE` | `/disconnect` | `GMAIL_CONNECT` | Revoke tokens and disconnect Gmail |
| `POST` | `/sync/:customerId` | `GMAIL_SYNC` | Trigger email sync for specific customer |
| `GET` | `/timeline/:customerId` | `COMMUNICATIONS_READ` | Return unified timeline (manual + Gmail) |

**Route details:**

```typescript
// GET /api/gmail/status
handler: async (request) => {
  return service.getConnectionStatus(request.user.id);
}

// GET /api/gmail/auth
handler: async (request) => {
  const url = service.getAuthUrl(request.user.id);
  return { authUrl: url };
}

// GET /api/gmail/callback (public — Google redirects here)
handler: async (request, reply) => {
  const { code, state } = request.query;
  await service.handleCallback(code, state);
  // Redirect to frontend with success indicator
  return reply.redirect('/?gmailConnected=true');
}

// DELETE /api/gmail/disconnect
handler: async (request, reply) => {
  await service.disconnect(request.user.id);
  return reply.status(204).send();
}

// POST /api/gmail/sync/:customerId
handler: async (request) => {
  const { customerId } = request.params;
  return service.syncEmails(request.user.id, customerId);
}

// GET /api/gmail/timeline/:customerId
handler: async (request) => {
  const { customerId } = request.params;
  const q = request.query;
  return service.getTimeline(request.user.id, customerId, {
    page: Number(q['page']),
    pageSize: Number(q['pageSize']),
  });
}
```

**Graceful degradation:**
- If `isGmailConfigured()` returns false, all routes except `/callback` return `501 Not Configured` with a helpful message

### 2. `packages/backend/src/app.ts`
Add import and registration:
```typescript
import { gmailRoutes } from './domains/gmail/gmail.routes.js';
// ...
await app.register(gmailRoutes, { prefix: '/api/gmail' });
```

## Files to Change
| File | Action |
|---|---|
| `packages/backend/src/domains/gmail/gmail.routes.ts` | Create |
| `packages/backend/src/app.ts` | Add import + register gmail routes |

## Verification
- All routes respond correctly when Gmail is configured
- Routes return 501 when Gmail is not configured
- Permission checks enforced (401/403 for unauthorized)
- OAuth callback redirects to frontend after token exchange
