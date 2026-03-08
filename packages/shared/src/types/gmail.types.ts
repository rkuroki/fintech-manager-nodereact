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
