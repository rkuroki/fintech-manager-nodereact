import argon2 from 'argon2';

/**
 * Hashes a plaintext password using argon2id.
 * argon2id is the OWASP-recommended algorithm (2023+), resistant to both
 * side-channel attacks (argon2i) and GPU brute force (argon2d).
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Verifies a plaintext password against a stored argon2 hash.
 * Returns true if they match, false otherwise.
 */
export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}
