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

export type IdentitySeedAction = 'create' | 'repair' | 'skip_existing_email' | 'skip_id_taken';

/** A carried v4 trial is imported only when it ends inside this many days. */
export const CARRIED_TRIAL_WINDOW_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type V4MembershipTier = 'premium' | 'trial';

export type V4MembershipDecision = {
  tier: V4MembershipTier;
  /** Set when a future trial ends within the carry window. The paid grant is not decided here. */
  carriedTrialEndsAt: Date | null;
};

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
 * The same email and id are the account this seed already wrote, so missing rows can be filled.
 * A different account's email is left unchanged. A taken id blocks a second account from adopting it.
 */
export function decideIdentitySeed(input: {
  emailAccountId: number | null;
  idTextAccountId: number | null;
}): IdentitySeedAction {
  if (
    input.emailAccountId !== null &&
    input.idTextAccountId !== null &&
    input.emailAccountId === input.idTextAccountId
  ) {
    return 'repair';
  }
  if (input.emailAccountId !== null) {
    return 'skip_existing_email';
  }
  if (input.idTextAccountId !== null) {
    return 'skip_id_taken';
  }
  return 'create';
}

/**
 * A timestamp column value, or null when it is missing or unreadable.
 */
export function readV4Timestamp(value: Date | string | null): Date | null {
  if (value === null) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

/** What one v4 row shows about its use, for choosing between two rows that share an address. */
export type V4IdentityUsage = {
  /** Latest history, queue, now playing, owned playlist, or user clip update. */
  activityAt: Date | null;
  /** Any subscription, followed playlist or user, or Add by RSS feed. */
  hasLists: boolean;
  verified: boolean;
  updatedAt: Date;
};

function isUsed(usage: V4IdentityUsage): boolean {
  return usage.activityAt !== null || usage.hasLists;
}

function laterOf(current: Date, incoming: Date): 'current' | 'incoming' | 'tie' {
  if (incoming.getTime() === current.getTime()) {
    return 'tie';
  }
  return incoming.getTime() > current.getTime() ? 'incoming' : 'current';
}

/**
 * Which v4 row keeps a shared address. A row that was used beats a row that never was.
 * Between used rows, the later dated activity wins, and a dated row beats one with lists only.
 * Otherwise a verified row wins, then the later account `updatedAt`. A tie keeps the account
 * already stored. The stored address is lowercase either way.
 */
export function preferV4Identity(input: {
  current: V4IdentityUsage;
  incoming: V4IdentityUsage;
}): 'current' | 'incoming' {
  const { current, incoming } = input;
  const currentUsed = isUsed(current);
  const incomingUsed = isUsed(incoming);
  if (currentUsed !== incomingUsed) {
    return incomingUsed ? 'incoming' : 'current';
  }
  if (current.activityAt !== null || incoming.activityAt !== null) {
    if (current.activityAt === null) {
      return 'incoming';
    }
    if (incoming.activityAt === null) {
      return 'current';
    }
    const byActivity = laterOf(current.activityAt, incoming.activityAt);
    if (byActivity !== 'tie') {
      return byActivity;
    }
  }
  if (current.verified !== incoming.verified) {
    return incoming.verified ? 'incoming' : 'current';
  }
  const byUpdate = laterOf(current.updatedAt, incoming.updatedAt);
  return byUpdate === 'tie' ? 'current' : byUpdate;
}

/**
 * Future paid expiry selects Premium. A trial that is still running and ends within
 * {@link CARRIED_TRIAL_WINDOW_DAYS} is carried. A later trial date is not imported.
 * Either date being absent leaves the account on Trial with no carried grant.
 */
export function decideV4Membership(input: {
  membershipExpiresAt: Date | null;
  freeTrialExpiresAt: Date | null;
  now: Date;
}): V4MembershipDecision {
  const paidCurrent =
    input.membershipExpiresAt !== null && input.membershipExpiresAt.getTime() > input.now.getTime();
  const trialEnd = input.freeTrialExpiresAt;
  const carried =
    trialEnd !== null &&
    trialEnd.getTime() > input.now.getTime() &&
    trialEnd.getTime() <= input.now.getTime() + CARRIED_TRIAL_WINDOW_DAYS * MS_PER_DAY;
  return {
    tier: paidCurrent ? 'premium' : 'trial',
    carriedTrialEndsAt: carried ? trialEnd : null,
  };
}
