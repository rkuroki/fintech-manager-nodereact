# TASK-001: Shared Types & Permissions

## Goal
Add Gmail-related permissions, TypeScript types, and Zod schemas to the shared package so both backend and frontend have a common contract.

## Changes

### 1. `packages/shared/src/constants/permissions.ts`
Add two new permissions:
```typescript
// Gmail
GMAIL_CONNECT: 'gmail:connect',
GMAIL_SYNC: 'gmail:sync',
```
Add both to `MANAGER_PERMISSIONS` array (managers and admins can connect Gmail and sync).

### 2. `packages/shared/src/types/gmail.types.ts` (NEW)
```typescript
import type { UUID, ISODateString } from './common.types.js';
import type { CommunicationRecord } from './customer.types.js';

export type GmailDirection = 'inbound' | 'outbound';

export interface GmailConnectionStatus {
  connected: boolean;
  email: string | null;
  connectedAt: ISODateString | null;
}

export interface GmailMessage {
  id: UUID;
  gmailId: string;
  threadId: string;
  customerId: UUID;
  direction: GmailDirection;
  from: string;
  to: string;
  subject: string | null;
  snippet: string | null;
  receivedAt: ISODateString;
  labelIds: string[];
  isRead: boolean;
}

export interface TimelineEntry {
  id: string;
  type: 'manual' | 'gmail';
  timestamp: ISODateString;
  data: CommunicationRecord | GmailMessage;
}

export interface GmailSyncResult {
  synced: number;
  customerId: UUID;
  lastSyncAt: ISODateString;
}
```

### 3. `packages/shared/src/schemas/gmail.schema.ts` (NEW)
Zod schemas for validation:
- `GmailConnectionStatusSchema`
- `GmailMessageSchema`
- `TimelineEntrySchema`
- `GmailSyncResultSchema`

### 4. `packages/shared/src/index.ts`
Export all new types and schemas.

### 5. Rebuild shared package
```bash
npm run build -w packages/shared
```

## Files to Change
| File | Action |
|---|---|
| `packages/shared/src/constants/permissions.ts` | Add GMAIL_CONNECT, GMAIL_SYNC |
| `packages/shared/src/types/gmail.types.ts` | Create |
| `packages/shared/src/schemas/gmail.schema.ts` | Create |
| `packages/shared/src/index.ts` | Add exports |

## Verification
- `npm run build -w packages/shared` succeeds
- `npm run typecheck -w packages/shared` passes
