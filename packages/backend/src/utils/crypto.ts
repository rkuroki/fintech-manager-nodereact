import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits — standard for GCM mode
const TAG_LENGTH = 16; // 128-bit authentication tag

let encryptionKey: Buffer | null = null;

/**
 * Initializes the encryption key from a 64-character hex string (32 bytes).
 * Must be called before encrypt/decrypt.
 */
export function initEncryption(keyHex: string): void {
  if (keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
  }
  encryptionKey = Buffer.from(keyHex, 'hex');
}

function getKey(): Buffer {
  if (!encryptionKey) {
    throw new Error('Encryption not initialized. Call initEncryption() first.');
  }
  return encryptionKey;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing: iv (12 bytes) + authTag (16 bytes) + ciphertext.
 * Each call generates a fresh random IV, so identical plaintexts produce different ciphertexts.
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: [iv(12)] [authTag(16)] [ciphertext(variable)]
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts a base64-encoded value produced by encrypt().
 * Throws if the authentication tag is invalid (data was tampered with or wrong key).
 */
export function decrypt(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  if (buf.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted value: too short');
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}

/** Encrypts a value only if it is non-null/non-empty. Returns null otherwise. */
export function encryptIfPresent(value: string | null | undefined): string | null {
  if (!value) return null;
  return encrypt(value);
}

/** Decrypts a value only if it is non-null. Returns null otherwise. */
export function decryptIfPresent(encoded: string | null | undefined): string | null {
  if (!encoded) return null;
  return decrypt(encoded);
}
