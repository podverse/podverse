import type { AddByRSSBasicAuthCredentials } from '@podverse/helpers-validation/client';

const ALGORITHM = 'AES-GCM';
const IV_LENGTH_BYTES = 12;

export type SealedCredentialSecrets = {
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: ArrayBuffer;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const isCredentialSecrets = (value: unknown): value is AddByRSSBasicAuthCredentials =>
  typeof value === 'object' &&
  value !== null &&
  'username' in value &&
  'password' in value &&
  typeof value.username === 'string' &&
  typeof value.password === 'string';

export const isCredentialCryptoAvailable = (): boolean =>
  typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.subtle !== 'undefined';

/**
 * A non-extractable AES-GCM key. IndexedDB can hold the key object itself, so the raw key bytes
 * never reach script. That protects stored credentials on disk; it does not protect them from
 * script running on the page (XSS), which can call decrypt with the same key.
 */
export const generateCredentialKey = (): Promise<CryptoKey> =>
  globalThis.crypto.subtle.generateKey({ name: ALGORITHM, length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);

/** `aad` binds the ciphertext to its record so one feed's secrets cannot be swapped onto another. */
export const encryptCredentialSecrets = async (
  key: CryptoKey,
  aad: string,
  secrets: AddByRSSBasicAuthCredentials
): Promise<SealedCredentialSecrets> => {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const plaintext = encoder.encode(
    JSON.stringify({ username: secrets.username, password: secrets.password })
  );
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: ALGORITHM, iv, additionalData: encoder.encode(aad) },
    key,
    plaintext
  );
  return { iv, ciphertext };
};

/** Null when the key, AAD, or ciphertext does not match. */
export const decryptCredentialSecrets = async (
  key: CryptoKey,
  aad: string,
  sealed: SealedCredentialSecrets
): Promise<AddByRSSBasicAuthCredentials | null> => {
  try {
    const plaintext = await globalThis.crypto.subtle.decrypt(
      { name: ALGORITHM, iv: sealed.iv, additionalData: encoder.encode(aad) },
      key,
      sealed.ciphertext
    );
    const parsed: unknown = JSON.parse(decoder.decode(plaintext));
    return isCredentialSecrets(parsed)
      ? { username: parsed.username, password: parsed.password }
      : null;
  } catch {
    return null;
  }
};
