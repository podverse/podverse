const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const EMAIL_MAX = 255;
const NAME_MAX = 255;

export type V4IdentitySource = {
  idText: string;
  email: string;
  displayName: string | null;
  verified: boolean;
  passwordHash: string;
};

export type V4IdentityParseFailure = 'bad_email' | 'bad_name' | 'bad_password' | 'bad_verified';

export type V4IdentityParseResult =
  | { ok: true; source: V4IdentitySource }
  | { ok: false; reason: V4IdentityParseFailure };

export type IdentitySeedAction = 'create' | 'skip_existing_email' | 'skip_id_taken';

export type V4IdentityRow = {
  idText: string;
  email: string | null;
  displayName: string | null;
  verified: boolean | null;
  passwordHash: string | null;
};

/**
 * One v4 user row, ready to copy. Rejects a hash, name, or email that cannot be stored.
 * The failure reason names the field, not the value.
 */
export function parseV4IdentityRow(row: V4IdentityRow): V4IdentityParseResult {
  const email = row.email === null ? '' : row.email.trim().toLowerCase();
  if (email.length < 3 || email.length > EMAIL_MAX || !email.includes('@')) {
    return { ok: false, reason: 'bad_email' };
  }

  const displayName = row.displayName === null ? null : row.displayName.trim();
  const normalizedName = displayName === null || displayName === '' ? null : displayName;
  if (normalizedName !== null && normalizedName.length > NAME_MAX) {
    return { ok: false, reason: 'bad_name' };
  }

  if (row.verified === null) {
    return { ok: false, reason: 'bad_verified' };
  }

  if (row.passwordHash === null || !BCRYPT_HASH.test(row.passwordHash)) {
    return { ok: false, reason: 'bad_password' };
  }

  return {
    ok: true,
    source: {
      idText: row.idText,
      email,
      displayName: normalizedName,
      verified: row.verified,
      passwordHash: row.passwordHash,
    },
  };
}

/**
 * An existing email wins and is left unchanged. A taken id blocks a second account
 * from adopting it. Otherwise the row can be created.
 */
export function decideIdentitySeed(input: {
  emailAccountId: number | null;
  idTextAccountId: number | null;
}): IdentitySeedAction {
  if (input.emailAccountId !== null) {
    return 'skip_existing_email';
  }
  if (input.idTextAccountId !== null) {
    return 'skip_id_taken';
  }
  return 'create';
}
