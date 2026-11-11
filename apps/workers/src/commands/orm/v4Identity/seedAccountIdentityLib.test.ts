import { describe, expect, it } from 'vitest';

import { decideIdentitySeed, parseV4IdentityRow } from './seedAccountIdentityLib.js';

const BCRYPT = `$2b$10$${'a'.repeat(53)}`;

function row(overrides: Partial<Parameters<typeof parseV4IdentityRow>[0]> = {}) {
  return {
    idText: 'abcd123',
    email: 'Person@Example.com',
    displayName: 'Person',
    verified: true,
    passwordHash: BCRYPT,
    ...overrides,
  };
}

describe('parseV4IdentityRow', () => {
  it('keeps a bcrypt hash and lowercases the email', () => {
    const parsed = parseV4IdentityRow(row());
    expect(parsed).toEqual({
      ok: true,
      source: {
        idText: 'abcd123',
        email: 'person@example.com',
        displayName: 'Person',
        verified: true,
        passwordHash: BCRYPT,
      },
    });
  });

  it('stores a blank name as null', () => {
    const parsed = parseV4IdentityRow(row({ displayName: '   ' }));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.source.displayName).toBeNull();
    }
  });

  it('rejects an email, a name, a missing verified flag, and a non-bcrypt hash', () => {
    expect(parseV4IdentityRow(row({ email: 'not-an-email' })).ok).toBe(false);
    expect(parseV4IdentityRow(row({ displayName: 'n'.repeat(256) }))).toEqual({
      ok: false,
      reason: 'bad_name',
    });
    expect(parseV4IdentityRow(row({ verified: null }))).toEqual({
      ok: false,
      reason: 'bad_verified',
    });
    expect(parseV4IdentityRow(row({ passwordHash: 'plain' }))).toEqual({
      ok: false,
      reason: 'bad_password',
    });
  });
});

describe('decideIdentitySeed', () => {
  it('leaves an existing email unchanged even when the id is also taken', () => {
    expect(decideIdentitySeed({ emailAccountId: 4, idTextAccountId: 9 })).toBe(
      'skip_existing_email'
    );
  });

  it('refuses to reuse an id that already belongs to another account', () => {
    expect(decideIdentitySeed({ emailAccountId: null, idTextAccountId: 9 })).toBe('skip_id_taken');
  });

  it('creates when neither the email nor the id is taken', () => {
    expect(decideIdentitySeed({ emailAccountId: null, idTextAccountId: null })).toBe('create');
  });
});
