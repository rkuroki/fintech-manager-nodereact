import { v4 as uuidv4 } from 'uuid';
import type {
  GmailConnectionStatus,
  GmailSyncResult,
  TimelineEntry,
  GmailMessage,
  CommunicationRecord,
  PaginatedResponse,
} from '@investor-backoffice/shared';
import { config, isGmailConfigured } from '../../config.js';
import { encrypt, decrypt } from '../../utils/crypto.js';
import { AppError, NotFoundError } from '../../utils/errors.js';
import { parsePagination } from '../../utils/pagination.js';
import * as repo from './gmail.repository.js';
import * as customerRepo from '../customers/customers.repository.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

/**
 * Asserts that Gmail integration is configured.
 * Throws 501 Not Implemented if Google credentials are missing.
 */
function requireGmailConfig(): void {
  if (!isGmailConfigured()) {
    throw new AppError(501, 'Gmail integration is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }
}

// ─── OAuth2 Flow ──────────────────────────────────────────────────────────

/**
 * Generates the Google OAuth2 consent URL.
 * State parameter is the encrypted userId for CSRF protection.
 */
export function getAuthUrl(userId: string): string {
  requireGmailConfig();

  const state = encrypt(userId);
  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID!,
    redirect_uri: config.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Handles the OAuth2 callback: exchanges auth code for tokens,
 * fetches the user's Gmail email, and stores encrypted tokens.
 */
export async function handleCallback(
  code: string,
  state: string,
): Promise<GmailConnectionStatus> {
  requireGmailConfig();

  // Decrypt state to get userId
  const userId = decrypt(state);

  // Exchange auth code for tokens
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.GOOGLE_CLIENT_ID!,
      client_secret: config.GOOGLE_CLIENT_SECRET!,
      redirect_uri: config.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new AppError(502, `Failed to exchange auth code: ${error}`);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Fetch user's Gmail email
  const profileResponse = await fetch(`${GMAIL_API_BASE}/profile`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new AppError(502, 'Failed to fetch Gmail profile');
  }

  const profile = (await profileResponse.json()) as { emailAddress: string };

  // Encrypt tokens for storage
  const accessTokenEnc = encrypt(tokenData.access_token);
  const refreshTokenEnc = encrypt(tokenData.refresh_token);
  const tokenExpiry = new Date(
    Date.now() + tokenData.expires_in * 1000,
  ).toISOString();

  await repo.upsertTokens({
    id: uuidv4(),
    userId,
    gmailEmail: profile.emailAddress,
    accessTokenEnc,
    refreshTokenEnc,
    tokenExpiry,
  });

  return {
    connected: true,
    email: profile.emailAddress,
    connectedAt: new Date().toISOString(),
  };
}

/**
 * Refreshes the access token using the stored refresh token.
 * Returns the new decrypted access token.
 */
async function refreshAccessToken(userId: string): Promise<string> {
  requireGmailConfig();

  const tokens = await repo.getTokensByUserId(userId);
  if (!tokens) {
    throw new AppError(400, 'Gmail not connected');
  }

  const refreshToken = decrypt(tokens.refreshTokenEnc);

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.GOOGLE_CLIENT_ID!,
      client_secret: config.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new AppError(502, 'Failed to refresh Gmail access token');
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  // Re-encrypt and update DB
  const accessTokenEnc = encrypt(data.access_token);
  const tokenExpiry = new Date(
    Date.now() + data.expires_in * 1000,
  ).toISOString();
  await repo.updateTokens(userId, { accessTokenEnc, tokenExpiry });

  return data.access_token;
}

/**
 * Returns a valid access token — refreshes if expired.
 */
async function getValidAccessToken(userId: string): Promise<string> {
  const tokens = await repo.getTokensByUserId(userId);
  if (!tokens) {
    throw new AppError(400, 'Gmail not connected');
  }

  // Check if token is expired (with 60s buffer)
  const expiry = new Date(tokens.tokenExpiry).getTime();
  if (Date.now() > expiry - 60_000) {
    return refreshAccessToken(userId);
  }

  return decrypt(tokens.accessTokenEnc);
}

// ─── Connection Status ────────────────────────────────────────────────────

export async function getConnectionStatus(
  userId: string,
): Promise<GmailConnectionStatus> {
  const tokens = await repo.getTokensByUserId(userId);
  if (!tokens) {
    return { connected: false, email: null, connectedAt: null };
  }
  return {
    connected: true,
    email: tokens.gmailEmail,
    connectedAt: tokens.connectedAt,
  };
}

// ─── Disconnect ───────────────────────────────────────────────────────────

export async function disconnect(userId: string): Promise<void> {
  const tokens = await repo.getTokensByUserId(userId);
  if (tokens) {
    try {
      // Attempt to revoke the token at Google
      const accessToken = decrypt(tokens.accessTokenEnc);
      await fetch(`${GOOGLE_REVOKE_URL}?token=${accessToken}`, {
        method: 'POST',
      });
    } catch {
      // Ignore revocation errors — token may already be invalid
    }
  }

  // Clean up local data
  await repo.deleteTokensByUserId(userId);
  await repo.deleteMessagesByUserId(userId);
}

// ─── Email Sync ───────────────────────────────────────────────────────────

/**
 * Parses Gmail message headers to extract From, To, Subject, Date.
 */
function parseGmailHeaders(
  headers: Array<{ name: string; value: string }>,
): { from: string; to: string; subject: string; date: string } {
  const get = (name: string): string => {
    const header = headers.find(
      (h) => h.name.toLowerCase() === name.toLowerCase(),
    );
    return header?.value ?? '';
  };
  return {
    from: get('From'),
    to: get('To'),
    subject: get('Subject'),
    date: get('Date'),
  };
}

/**
 * Extracts the email address from a "Name <email>" or plain email string.
 */
function extractEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1]! : value).trim().toLowerCase();
}

/**
 * Syncs Gmail messages for a specific customer.
 * Queries Gmail API for messages to/from the customer's email.
 * Supports incremental sync via the `after:` Gmail search operator.
 */
export async function syncEmails(
  userId: string,
  customerId: string,
): Promise<GmailSyncResult> {
  requireGmailConfig();

  // Get customer email
  const customer = await customerRepo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) {
    throw new NotFoundError('Customer not found');
  }

  if (!customer.email) {
    return {
      synced: 0,
      customerId,
      lastSyncAt: new Date().toISOString(),
    };
  }

  const accessToken = await getValidAccessToken(userId);
  const tokens = await repo.getTokensByUserId(userId);
  const userGmailEmail = tokens?.gmailEmail ?? '';

  // Build Gmail search query
  let query = `from:${customer.email} OR to:${customer.email}`;

  // Incremental sync: only messages after last sync
  const lastDate = await repo.getLatestMessageDate(userId, customerId);
  if (lastDate) {
    // Gmail search uses format: YYYY/MM/DD
    const afterDate = new Date(lastDate);
    const formatted = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, '0')}/${String(afterDate.getDate()).padStart(2, '0')}`;
    query += ` after:${formatted}`;
  }

  // Fetch message list from Gmail API
  const listUrl = new URL(`${GMAIL_API_BASE}/messages`);
  listUrl.searchParams.set('q', query);
  listUrl.searchParams.set('maxResults', '50');

  const listResponse = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listResponse.ok) {
    if (listResponse.status === 429) {
      throw new AppError(429, 'Gmail API rate limit exceeded. Try again later.');
    }
    throw new AppError(502, 'Failed to fetch Gmail messages list');
  }

  const listData = (await listResponse.json()) as {
    messages?: Array<{ id: string; threadId: string }>;
    resultSizeEstimate?: number;
  };

  if (!listData.messages || listData.messages.length === 0) {
    return {
      synced: 0,
      customerId,
      lastSyncAt: new Date().toISOString(),
    };
  }

  // Fetch metadata for each message
  const messagesToInsert: (typeof import('../../db/schema/gmail.js').gmailMessages.$inferInsert)[] = [];

  for (const msg of listData.messages) {
    const metaUrl = `${GMAIL_API_BASE}/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`;

    const metaResponse = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metaResponse.ok) continue;

    const metaData = (await metaResponse.json()) as {
      id: string;
      threadId: string;
      snippet: string;
      labelIds: string[];
      payload: {
        headers: Array<{ name: string; value: string }>;
      };
    };

    const headers = parseGmailHeaders(metaData.payload.headers);
    const fromEmail = extractEmail(headers.from);
    const toEmail = extractEmail(headers.to);

    // Determine direction based on user's Gmail address
    const direction =
      fromEmail === userGmailEmail.toLowerCase() ? 'outbound' : 'inbound';

    // Parse date — Gmail Date header is RFC 2822 format
    let receivedAt: string;
    try {
      receivedAt = new Date(headers.date).toISOString();
    } catch {
      receivedAt = new Date().toISOString();
    }

    messagesToInsert.push({
      id: uuidv4(),
      gmailId: metaData.id,
      threadId: metaData.threadId,
      customerId,
      userId,
      direction: direction as 'inbound' | 'outbound',
      fromAddress: headers.from,
      toAddress: headers.to,
      subject: headers.subject || null,
      snippet: metaData.snippet || null,
      receivedAt,
      labelIds: JSON.stringify(metaData.labelIds ?? []),
      isRead: (metaData.labelIds ?? []).includes('UNREAD') ? 0 : 1,
    });
  }

  // Batch upsert
  await repo.upsertMessages(messagesToInsert);

  return {
    synced: messagesToInsert.length,
    customerId,
    lastSyncAt: new Date().toISOString(),
  };
}

// ─── Unified Timeline ─────────────────────────────────────────────────────

/**
 * Returns a unified timeline merging manual communication records
 * with Gmail messages, sorted by timestamp descending.
 */
export async function getTimeline(
  userId: string,
  customerId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<PaginatedResponse<TimelineEntry>> {
  // Verify customer exists
  const customer = await customerRepo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) {
    throw new NotFoundError('Customer not found');
  }

  // Fetch both sources
  const [manualRecords, gmailMsgs] = await Promise.all([
    repo.listCommunicationsForTimeline(customerId),
    repo.listGmailMessagesForTimeline(customerId, userId),
  ]);

  // Map to timeline entries
  const manualEntries: TimelineEntry[] = manualRecords.map((r) => ({
    id: r.id,
    type: 'manual' as const,
    timestamp: r.occurredAt,
    data: {
      id: r.id,
      customerId: r.customerId,
      channel: r.channel as CommunicationRecord['channel'],
      summary: r.summary,
      occurredAt: r.occurredAt,
      recordedBy: r.recordedBy,
      createdAt: r.createdAt,
    },
  }));

  const gmailEntries: TimelineEntry[] = gmailMsgs.map((m) => ({
    id: m.id,
    type: 'gmail' as const,
    timestamp: m.receivedAt,
    data: {
      id: m.id,
      gmailId: m.gmailId,
      threadId: m.threadId,
      customerId: m.customerId,
      direction: m.direction as GmailMessage['direction'],
      from: m.fromAddress,
      to: m.toAddress,
      subject: m.subject,
      snippet: m.snippet,
      receivedAt: m.receivedAt,
      labelIds: m.labelIds ? JSON.parse(m.labelIds) : [],
      isRead: !!m.isRead,
    },
  }));

  // Merge and sort by timestamp descending
  const allEntries = [...manualEntries, ...gmailEntries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Paginate
  const { limit, offset, page, pageSize } = parsePagination(opts);
  const paged = allEntries.slice(offset, offset + limit);

  return {
    data: paged,
    total: allEntries.length,
    page,
    pageSize,
  };
}
