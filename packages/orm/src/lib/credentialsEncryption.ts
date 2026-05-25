import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { getORMConfig } from '@orm/context.js';

const ENCRYPTION_PREFIX = 'v1:';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH_BYTES = 32;
const ALGORITHM = 'aes-256-gcm';

/**
 * Validates key hex is 64 chars (32 bytes) and returns the key buffer. Returns null if invalid.
 */
function keyHexToBuffer(keyHex: string | undefined): Buffer | null {
  if (!keyHex || typeof keyHex !== 'string') {
    return null;
  }
  const key = Buffer.from(keyHex, 'hex');
  return key.length === KEY_LENGTH_BYTES ? key : null;
}

/**
 * Returns the raw key buffer from config. Key must be 64 hex chars (32 bytes).
 * Throws if key is missing or invalid length.
 */
function getKeyBuffer(): Buffer {
  const keyHex = getORMConfig().addByRssCredentialsEncryptionKey;
  if (!keyHex || typeof keyHex !== 'string') {
    throw new Error('ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY is required for credential encryption');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY must be 64 hex characters (32 bytes), got ${keyHex.length} chars`
    );
  }
  return key;
}

/**
 * Returns true if encryption is configured (key is set and valid format).
 */
export function isEncryptionConfigured(): boolean {
  const keyHex = getORMConfig().addByRssCredentialsEncryptionKey;
  if (!keyHex || typeof keyHex !== 'string') {
    return false;
  }
  const key = Buffer.from(keyHex, 'hex');
  return key.length === KEY_LENGTH_BYTES;
}

/**
 * Encrypts a plaintext string. Uses AES-256-GCM with a random IV per value.
 * Stored format: "v1:" + base64(iv || ciphertext || authTag).
 * Throws if encryption key is not configured.
 */
export function encryptCredentials(plaintext: string): string {
  const key = getKeyBuffer();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, tag]);
  return ENCRYPTION_PREFIX + combined.toString('base64');
}

/**
 * Decrypts a value using an explicit key (64 hex chars). Use for key-rotation scripts.
 * Returns null if the value is not `v1:` ciphertext, the key is invalid, or decryption fails.
 */
export function decryptWithKey(ciphertext: string, keyHex: string): string | null {
  if (!ciphertext.startsWith(ENCRYPTION_PREFIX)) {
    return null;
  }
  const key = keyHexToBuffer(keyHex);
  if (!key) {
    return null;
  }
  return decryptWithKeyBuffer(ciphertext, key);
}

/**
 * Internal: decrypt v1-prefixed ciphertext with the given key buffer.
 */
function decryptWithKeyBuffer(ciphertext: string, key: Buffer): string | null {
  try {
    const combined = Buffer.from(ciphertext.slice(ENCRYPTION_PREFIX.length), 'base64');
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      return null;
    }
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    return null;
  }
}

/**
 * Decrypts `v1:` ciphertext. Returns null when the value is not encrypted or decryption fails.
 * Tries current key first; if that fails and addByRssCredentialsEncryptionKeyOld is set, tries the old key (for key rotation).
 */
export function decryptCredentials(ciphertext: string): string | null {
  if (!ciphertext.startsWith(ENCRYPTION_PREFIX)) {
    return null;
  }
  const config = getORMConfig();
  const key = keyHexToBuffer(config.addByRssCredentialsEncryptionKey);
  if (key) {
    const result = decryptWithKeyBuffer(ciphertext, key);
    if (result !== null) {
      return result;
    }
  }
  const oldKey = keyHexToBuffer(config.addByRssCredentialsEncryptionKeyOld);
  if (oldKey) {
    const result = decryptWithKeyBuffer(ciphertext, oldKey);
    if (result !== null) {
      return result;
    }
  }
  return null;
}
