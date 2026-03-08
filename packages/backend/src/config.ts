import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3001),
  DATABASE_PATH: z.string().default('./data/dev.db'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)')
    .regex(/^[0-9a-f]+$/i, 'ENCRYPTION_KEY must be hexadecimal'),
  UPLOADS_PATH: z.string().default('./data/uploads'),
  SEED_DB: z.coerce.boolean().default(false),

  // Gmail integration (optional — features disabled when not set)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional().default('http://localhost:3001/api/gmail/callback'),
});

function loadConfig() {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;

/** Returns true when Google OAuth2 credentials are configured */
export function isGmailConfigured(): boolean {
  return !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
}
