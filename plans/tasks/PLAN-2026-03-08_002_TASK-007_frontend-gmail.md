# TASK-007: Frontend — API Client & Components

## Goal
Create the frontend Gmail API client, GmailConnectButton component, and rewrite the CommunicationsTab to show a unified timeline of manual records + Gmail emails.

## Changes

### 1. `packages/frontend/src/api/gmail.api.ts` (NEW)
```typescript
import { apiClient } from './client.js';
import type {
  GmailConnectionStatus,
  GmailSyncResult,
  TimelineEntry,
  PaginatedResponse,
  PaginationParams,
} from '@investor-backoffice/shared';

export const gmailApi = {
  getStatus: (): Promise<GmailConnectionStatus> =>
    apiClient.get('/gmail/status').then((r) => r.data),

  getAuthUrl: (): Promise<{ authUrl: string }> =>
    apiClient.get('/gmail/auth').then((r) => r.data),

  disconnect: (): Promise<void> =>
    apiClient.delete('/gmail/disconnect').then(() => undefined),

  syncEmails: (customerId: string): Promise<GmailSyncResult> =>
    apiClient.post(`/gmail/sync/${customerId}`).then((r) => r.data),

  getTimeline: (
    customerId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<TimelineEntry>> =>
    apiClient.get(`/gmail/timeline/${customerId}`, { params }).then((r) => r.data),
};
```

### 2. `packages/frontend/src/components/common/GmailConnectButton.tsx` (NEW)
- Uses `useQuery` to fetch `gmailApi.getStatus()`
- **Not connected state:** Shows "Connect Gmail" button with Google icon
  - On click: calls `gmailApi.getAuthUrl()` → opens URL in new window/tab
  - After popup closes or URL param detected: refetch status
- **Connected state:** Shows "Connected as analyst@company.com" badge
  - "Disconnect" button with confirmation popover
  - On disconnect: calls `gmailApi.disconnect()` → invalidate queries
- **Gmail not configured (501):** Button hidden entirely (graceful degradation)
- Only visible when user has `GMAIL_CONNECT` permission

### 3. `packages/frontend/src/pages/Customers/CustomerDetailPage.tsx` (MODIFY)
**Rewrite `CommunicationsTab` component:**

**Layout:**
```
┌──────────────────────────────────────────────┐
│  [GmailConnectButton]        [🔄 Sync Emails] │
├──────────────────────────────────────────────┤
│  Timeline (Ant Design Timeline component)     │
│                                              │
│  📧 ↓ Subject: Re: Investment Report         │
│     snippet preview text...                  │
│     Mar 8, 2026 10:30 AM                     │
│                                              │
│  📝 [phone] Called to discuss portfolio       │
│     Mar 7, 2026 3:15 PM                      │
│                                              │
│  📧 ↑ Subject: Monthly Report Q1 2026        │
│     snippet preview text...                  │
│     Mar 6, 2026 9:00 AM                      │
│                                              │
│  📝 [email] Sent onboarding documents        │
│     Mar 5, 2026 2:00 PM                      │
│                                              │
│  [Load More]                                 │
└──────────────────────────────────────────────┘
```

**Data flow:**
1. Fetch timeline from `gmailApi.getTimeline(customerId)`
2. If Gmail endpoint returns 501 (not configured) or 403, fall back to `customersApi.listCommunications()`
3. "Sync Emails" button calls `gmailApi.syncEmails(customerId)` with loading spinner
4. After sync completes, invalidate timeline query to refresh

**Timeline entry rendering:**
- **Manual records (`type: 'manual'`):** Channel tag (email/phone/whatsapp/meeting) + summary + timestamp (keep existing style)
- **Gmail entries (`type: 'gmail'`):** Gmail icon + direction arrow (↓ received / ↑ sent) + subject + snippet + timestamp
- Use Ant Design `Timeline` or `List` component
- Color coding: blue dot for manual, red/green for gmail (green = sent, red = received)

**"Add Communication" button** remains functional for manual records (existing behavior preserved).

## Files to Change
| File | Action |
|---|---|
| `packages/frontend/src/api/gmail.api.ts` | Create |
| `packages/frontend/src/components/common/GmailConnectButton.tsx` | Create |
| `packages/frontend/src/pages/Customers/CustomerDetailPage.tsx` | Modify CommunicationsTab |

## Verification
- Gmail connect/disconnect button works
- Unified timeline shows both manual and Gmail entries sorted by time
- Sync button triggers sync and refreshes timeline
- Graceful fallback when Gmail is not configured (manual-only view)
- Permissions: only users with GMAIL_CONNECT see connect button
