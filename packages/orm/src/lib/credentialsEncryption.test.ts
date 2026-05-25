import type { ORMConfig } from '@orm/config/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@orm/context.js', () => ({
  getORMConfig: vi.fn(),
}));

import { getORMConfig } from '@orm/context.js';

import { decryptCredentials, decryptWithKey, encryptCredentials } from './credentialsEncryption.js';

const KEY_A = `${'a'.repeat(63)}a`;
const KEY_B = `${'b'.repeat(63)}b`;

const baseConfig = (overrides?: Partial<ORMConfig>): ORMConfig => ({
  database: {
    host: 'localhost',
    port: 5432,
    read_username: 'r',
    read_password: 'r',
    read_write_username: 'rw',
    read_write_password: 'rw',
    database: 'podverse_app_test',
    ssl_connection: false,
  },
  log: { level: 'error' },
  defaults: { account: { settings: {} } },
  addByRssCredentialsEncryptionKey: KEY_A,
  ...overrides,
});

beforeEach(() => {
  vi.mocked(getORMConfig).mockReturnValue(baseConfig());
});

describe('credentialsEncryption', () => {
  it('encrypts and decrypts with the current key', () => {
    const encrypted = encryptCredentials('secret-user');
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(decryptCredentials(encrypted)).toBe('secret-user');
  });

  it('returns null for non-prefixed values', () => {
    expect(decryptCredentials('plain-text')).toBe(null);
    expect(decryptWithKey('plain-text', KEY_A)).toBe(null);
  });

  it('decryptWithKey returns null when ciphertext is not v1-prefixed', () => {
    expect(decryptWithKey('not-encrypted', KEY_A)).toBe(null);
  });

  it('decryptCredentials uses addByRssCredentialsEncryptionKeyOld when current key fails', () => {
    vi.mocked(getORMConfig).mockReturnValue(
      baseConfig({ addByRssCredentialsEncryptionKey: KEY_B })
    );
    const encryptedWithB = encryptCredentials('rotated-secret');

    vi.mocked(getORMConfig).mockReturnValue(
      baseConfig({
        addByRssCredentialsEncryptionKey: KEY_A,
        addByRssCredentialsEncryptionKeyOld: KEY_B,
      })
    );

    expect(decryptCredentials(encryptedWithB)).toBe('rotated-secret');
  });
});
