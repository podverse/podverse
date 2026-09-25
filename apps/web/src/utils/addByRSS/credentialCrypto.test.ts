import { webcrypto } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  decryptCredentialSecrets,
  encryptCredentialSecrets,
  generateCredentialKey,
} from './credentialCrypto';

const secrets = { username: 'listener', password: 'p@ss:word/with?chars' };
const aad = 'account-1|https://example.com/feed.xml';

describe('credentialCrypto', () => {
  beforeAll(() => {
    // jsdom's `crypto` has no `subtle`; the Node implementation is the same WebCrypto API.
    vi.stubGlobal('crypto', webcrypto);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips secrets and never stores them as plaintext', async () => {
    const key = await generateCredentialKey();
    const sealed = await encryptCredentialSecrets(key, aad, secrets);

    expect(new TextDecoder().decode(sealed.ciphertext)).not.toContain(secrets.password);
    await expect(decryptCredentialSecrets(key, aad, sealed)).resolves.toEqual(secrets);
  });

  it('uses a fresh IV per encryption', async () => {
    const key = await generateCredentialKey();
    const first = await encryptCredentialSecrets(key, aad, secrets);
    const second = await encryptCredentialSecrets(key, aad, secrets);

    expect(Array.from(first.iv)).not.toEqual(Array.from(second.iv));
  });

  it('returns null when the record binding, key, or ciphertext does not match', async () => {
    const key = await generateCredentialKey();
    const otherKey = await generateCredentialKey();
    const sealed = await encryptCredentialSecrets(key, aad, secrets);
    const tampered = new Uint8Array(sealed.ciphertext.slice(0));
    tampered[0] = (tampered[0] ?? 0) ^ 0xff;

    await expect(
      decryptCredentialSecrets(key, 'account-1|https://other.example.com/feed.xml', sealed)
    ).resolves.toBeNull();
    await expect(decryptCredentialSecrets(otherKey, aad, sealed)).resolves.toBeNull();
    await expect(
      decryptCredentialSecrets(key, aad, { iv: sealed.iv, ciphertext: tampered.buffer })
    ).resolves.toBeNull();
  });

  it('creates keys whose raw bytes cannot be exported', async () => {
    const key = await generateCredentialKey();

    expect(key.extractable).toBe(false);
    await expect(globalThis.crypto.subtle.exportKey('raw', key)).rejects.toThrow();
  });
});
