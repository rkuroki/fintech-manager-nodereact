import { z } from 'zod';

export const GmailConnectionStatusSchema = z.object({
  connected: z.boolean(),
  email: z.string().email().nullable(),
  connectedAt: z.string().nullable(),
});

export type GmailConnectionStatusDto = z.infer<typeof GmailConnectionStatusSchema>;

export const GmailMessageSchema = z.object({
  id: z.string(),
  gmailId: z.string(),
  threadId: z.string(),
  customerId: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  from: z.string(),
  to: z.string(),
  subject: z.string().nullable(),
  snippet: z.string().nullable(),
  receivedAt: z.string(),
  labelIds: z.array(z.string()),
  isRead: z.boolean(),
});

export type GmailMessageDto = z.infer<typeof GmailMessageSchema>;

export const TimelineEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['manual', 'gmail']),
  timestamp: z.string(),
  data: z.record(z.unknown()),
});

export type TimelineEntryDto = z.infer<typeof TimelineEntrySchema>;

export const GmailSyncResultSchema = z.object({
  synced: z.number().int().min(0),
  customerId: z.string(),
  lastSyncAt: z.string(),
});

export type GmailSyncResultDto = z.infer<typeof GmailSyncResultSchema>;
