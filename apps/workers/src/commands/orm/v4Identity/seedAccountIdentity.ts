import { randomUUID } from 'node:crypto';

import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';
import { Client } from 'pg';
import type { EntityManager } from 'typeorm';

import {
  AccountMembershipEnum,
  AccountNotificationTypeEnum,
  DEFAULT_LOCALE,
  DEFAULT_MEDIA_TYPE_PREFERENCE,
  SharableStatusEnum,
} from '@podverse/helpers';
import {
  Account,
  AccountCredentials,
  AccountMembershipStatus,
  AccountMembershipStatusService,
  AccountMetaboost,
  AccountNotificationPreferenceService,
  AccountProfile,
  AccountSettings,
  AccountSettingsLocale,
  AccountSettingsNotification,
  AccountSettingsNotificationType,
  AccountSettingsPlayback,
  BillingEntitlementService,
  BillingMembershipGrant,
  BillingMembershipGrantService,
  getDataSourceReadWrite,
  isPostgresUniqueViolation,
  isValidNanoIdV2IdText,
} from '@podverse/orm';

import type {
  IdentitySeedAction,
  V4IdentitySource,
  V4IdentityUsage,
  V4MembershipDecision,
} from './seedAccountIdentityLib.js';
import {
  decideIdentitySeed,
  decideV4Membership,
  parseV4IdentityRow,
  preferV4Identity,
  readV4Timestamp,
} from './seedAccountIdentityLib.js';

export const V4_SEED_ACCOUNT_IDENTITY_HELP = `v4SeedAccountIdentity

Copy one v4 account into v5: email, bcrypt hash, name, verified flag, and the
v4 id as account.id_text. Also writes the settings, membership status, and
metaboost rows a signup creates. A future paid v4 expiry sets Premium. A v4
trial that ends within 90 days becomes a Trial grant ending then; the account
stays Trial unless the paid expiry is also in the future. No signup trial and
no paid grant. The paid grant, including the five-year cap, is the membership
import. Does not copy a library. v4_library_copied_at stays null.

Running it again for the same v4 id fills any of those rows that are missing
and leaves a membership status that already exists unchanged.

Flags:
  --v4-id id    v4 users.id (required)
  --dry-run     Decide create, repair, or skip; do not write
  --help        Show this text

Requires V4_DATABASE_URL plus the Base and ORM worker env. An email that
already belongs to a different account is left unchanged, except when that
account is the other letter-case of the same v4 address. A row that was used
(lists, playback, playlists, or clips) beats one that never was. Between used
rows, the later dated activity wins. Otherwise a verified row, then the later
account updatedAt, keeps the address. The other v4 id is logged.
The stored email is lowercase, including a mixed-case address with no twin.
A copied library, or a grant other than the carried trial, is left unchanged.
An id that already belongs to a different account is not reused. The log line
is the id and the action, never the email or the password hash.
`;

const USAGE_SQL = `
SELECT u.id AS id_text,
       u.email,
       u."emailVerified" AS verified,
       u."updatedAt" AS updated_at,
       (cardinality(u."subscribedPodcastIds") > 0
         OR cardinality(u."subscribedPlaylistIds") > 0
         OR cardinality(u."subscribedUserIds") > 0
         OR cardinality(u."addByRSSPodcastFeedUrls") > 0) AS has_lists,
       (SELECT MAX(activity.at) FROM (
          SELECT MAX("updatedAt") AS at FROM "userHistoryItems" WHERE "ownerId" = u.id
          UNION ALL
          SELECT MAX("updatedAt") FROM "userQueueItems" WHERE "ownerId" = u.id
          UNION ALL
          SELECT MAX("updatedAt") FROM "userNowPlayingItems" WHERE "ownerId" = u.id
          UNION ALL
          SELECT MAX("updatedAt") FROM playlists WHERE "ownerId" = u.id
          UNION ALL
          SELECT MAX("updatedAt") FROM "mediaRefs"
          WHERE "ownerId" = u.id
            AND "isOfficialChapter" IS NOT TRUE
            AND "isOfficialSoundBite" IS NOT TRUE
        ) activity) AS activity_at
FROM users u
WHERE u.id = $1
`;

const SOURCE_SQL = `
SELECT id AS id_text,
       email,
       NULLIF(btrim(name), '') AS display_name,
       "emailVerified" AS verified,
       password AS password_hash,
       "membershipExpiration" AS membership_expires_at,
       "freeTrialExpiration" AS free_trial_expires_at
FROM users
WHERE id = $1
`;

function hasOption(args: CommandLineArgs, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(args, name);
}

function optionValue(args: CommandLineArgs, name: string): string | null {
  const value = args[name];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  return trimmed;
}

type SourceQueryRow = {
  id_text: string;
  email: string | null;
  display_name: string | null;
  verified: boolean | null;
  password_hash: string | null;
  membership_expires_at: Date | string | null;
  free_trial_expires_at: Date | string | null;
};

async function readV4Identity(connectionString: string, v4Id: string): Promise<SourceQueryRow> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query<SourceQueryRow>(SOURCE_SQL, [v4Id]);
    const row = result.rows[0];
    if (result.rows.length !== 1 || row === undefined) {
      throw new Error('No v4 account for that id.');
    }
    return row;
  } catch (error) {
    if (error instanceof Error && error.message === 'No v4 account for that id.') {
      throw error;
    }
    throw new Error('Could not read the v4 account.', { cause: error });
  } finally {
    await client.end().catch(() => undefined);
  }
}

type UsageQueryRow = {
  id_text: string;
  email: string | null;
  verified: boolean | null;
  updated_at: Date | string | null;
  has_lists: boolean | null;
  activity_at: Date | string | null;
};

type V4RowUsage = { email: string | null; usage: V4IdentityUsage };

type CaseVariantResolution =
  | { kind: 'unrelated' }
  | { kind: 'keep_current'; otherV4Id: string }
  | { kind: 'blocked_library'; otherV4Id: string }
  | { kind: 'blocked_grants'; otherV4Id: string }
  | { kind: 'replace'; otherV4Id: string };

function normalizedEmail(email: string | null): string | null {
  if (email === null) {
    return null;
  }
  const value = email.trim().toLowerCase();
  return value === '' ? null : value;
}

async function readV4Usage(connectionString: string, v4Id: string): Promise<V4RowUsage | null> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query<UsageQueryRow>(USAGE_SQL, [v4Id]);
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }
    const updatedAt = readV4Timestamp(row.updated_at);
    if (updatedAt === null) {
      return null;
    }
    return {
      email: row.email,
      usage: {
        activityAt: readV4Timestamp(row.activity_at),
        hasLists: row.has_lists === true,
        verified: row.verified === true,
        updatedAt,
      },
    };
  } catch (error) {
    throw new Error('Could not read the v4 account.', { cause: error });
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function findAccountIdByEmail(email: string): Promise<number | null> {
  const rows = await getDataSourceReadWrite()
    .getRepository(AccountCredentials)
    .createQueryBuilder('credentials')
    .select(['credentials.account_id'])
    .where('credentials.email = :email', { email })
    .getMany();
  const ids = [...new Set(rows.map((row) => row.account_id))];
  if (ids.length > 1) {
    throw new Error('More than one v5 account uses that email.');
  }
  return ids[0] ?? null;
}

async function findAccountIdByIdText(idText: string): Promise<number | null> {
  const account = await getDataSourceReadWrite()
    .getRepository(Account)
    .findOne({
      where: { id_text: idText },
    });
  return account?.id ?? null;
}

type ScaffoldResult = {
  accountId: number;
  wroteRows: boolean;
  wroteMembership: boolean;
};

/**
 * Settings, metaboost, and membership status that signup creates. A membership status that
 * already exists is left as it is, including its tier and grants. The paid grant is not written.
 */
async function ensureSignupRows(
  manager: EntityManager,
  account: Account,
  membership: V4MembershipDecision,
  now: Date
): Promise<Omit<ScaffoldResult, 'accountId'>> {
  let wroteRows = false;

  const existingSettings = await manager
    .getRepository(AccountSettings)
    .findOne({ where: { account_id: account.id } });
  if (existingSettings === null) {
    const savedSettings = await manager.getRepository(AccountSettings).save(
      manager.getRepository(AccountSettings).create({
        account_id: account.id,
        allow_listen_stats: false,
        listen_stats_accepted: null,
        listen_stats_agreement_version: null,
        listen_stats_decided_at: null,
        listen_stats_opted_out_at: null,
      })
    );
    await manager.getRepository(AccountSettingsLocale).save(
      manager.getRepository(AccountSettingsLocale).create({
        account_settings_id: savedSettings.id,
        locale: DEFAULT_LOCALE,
      })
    );
    const notification = await manager.getRepository(AccountSettingsNotification).save(
      manager.getRepository(AccountSettingsNotification).create({
        account_settings_id: savedSettings.id,
        auto_enable_on_subscribe: false,
      })
    );
    await manager.getRepository(AccountSettingsPlayback).save(
      manager.getRepository(AccountSettingsPlayback).create({
        account_settings_id: savedSettings.id,
        preferred_media_type: DEFAULT_MEDIA_TYPE_PREFERENCE,
      })
    );
    await manager.getRepository(AccountSettingsNotificationType).save([
      manager.getRepository(AccountSettingsNotificationType).create({
        account_settings_notification_id: notification.id,
        type: AccountNotificationTypeEnum.NewItem,
      }),
      manager.getRepository(AccountSettingsNotificationType).create({
        account_settings_notification_id: notification.id,
        type: AccountNotificationTypeEnum.LivestreamStarting,
      }),
    ]);
    wroteRows = true;
  }

  const existingMetaboost = await manager
    .getRepository(AccountMetaboost)
    .findOne({ where: { account_id: account.id } });
  if (existingMetaboost === null) {
    await manager.getRepository(AccountMetaboost).save(
      manager.getRepository(AccountMetaboost).create({
        account_id: account.id,
        sender_guid: randomUUID(),
      })
    );
    wroteRows = true;
  }

  const existingStatus = await manager
    .getRepository(AccountMembershipStatus)
    .createQueryBuilder('status')
    .where('status.account_id = :accountId', { accountId: account.id })
    .getOne();
  if (existingStatus !== null) {
    return { wroteRows, wroteMembership: false };
  }

  const tierId =
    membership.tier === 'premium' ? AccountMembershipEnum.Premium : AccountMembershipEnum.Trial;
  await new AccountMembershipStatusService(manager).update(account, {
    account_membership_id: tierId,
    membership_expires_at: null,
  });
  if (membership.carriedTrialEndsAt !== null) {
    await new BillingMembershipGrantService().insertWithManager(manager, {
      accountId: account.id,
      source: 'trial',
      startsAt: now,
      endsAt: membership.carriedTrialEndsAt,
    });
    await new BillingEntitlementService().recomputeWithManager(manager, account.id, now);
  }
  return { wroteRows: true, wroteMembership: true };
}

async function createIdentity(
  source: V4IdentitySource,
  membership: V4MembershipDecision,
  now: Date
): Promise<ScaffoldResult> {
  return getDataSourceReadWrite().transaction(async (manager) => {
    const saved = await manager.getRepository(Account).save(
      manager.getRepository(Account).create({
        id_text: source.idText,
        verified: source.verified,
        sharable_status_id: SharableStatusEnum.Private,
        billing_customer_ref: randomUUID(),
        v4_library_copied_at: null,
      })
    );
    await manager.getRepository(AccountCredentials).save(
      manager.getRepository(AccountCredentials).create({
        account_id: saved.id,
        email: source.email,
        username: null,
        password: source.passwordHash,
      })
    );
    await manager.getRepository(AccountProfile).save(
      manager.getRepository(AccountProfile).create({
        account: saved,
        display_name: source.displayName,
        bio: null,
      })
    );
    const scaffold = await ensureSignupRows(manager, saved, membership, now);
    return { accountId: saved.id, ...scaffold };
  });
}

async function repairIdentity(
  accountId: number,
  membership: V4MembershipDecision,
  now: Date
): Promise<ScaffoldResult> {
  return getDataSourceReadWrite().transaction(async (manager) => {
    const account = await manager.getRepository(Account).findOne({ where: { id: accountId } });
    if (account === null) {
      throw new Error('Could not write the v5 identity.');
    }
    const scaffold = await ensureSignupRows(manager, account, membership, now);
    return { accountId: account.id, ...scaffold };
  });
}

async function resolveCaseVariant(input: {
  connectionString: string;
  accountId: number;
  incomingIdText: string;
  incomingEmail: string;
}): Promise<CaseVariantResolution> {
  const account = await getDataSourceReadWrite()
    .getRepository(Account)
    .findOne({
      where: { id: input.accountId },
    });
  if (account === null || !isValidNanoIdV2IdText(account.id_text)) {
    return { kind: 'unrelated' };
  }
  const [occupant, incoming] = await Promise.all([
    readV4Usage(input.connectionString, account.id_text),
    readV4Usage(input.connectionString, input.incomingIdText),
  ]);
  if (
    occupant === null ||
    incoming === null ||
    normalizedEmail(occupant.email) !== input.incomingEmail
  ) {
    return { kind: 'unrelated' };
  }
  const preference = preferV4Identity({ current: occupant.usage, incoming: incoming.usage });
  if (preference === 'current') {
    return { kind: 'keep_current', otherV4Id: account.id_text };
  }
  if (account.v4_library_copied_at !== null && account.v4_library_copied_at !== undefined) {
    return { kind: 'blocked_library', otherV4Id: account.id_text };
  }
  const grants = await getDataSourceReadWrite()
    .getRepository(BillingMembershipGrant)
    .find({
      where: { account_id: account.id },
    });
  if (grants.some((grant) => grant.source !== 'trial')) {
    return { kind: 'blocked_grants', otherV4Id: account.id_text };
  }
  return { kind: 'replace', otherV4Id: account.id_text };
}

/**
 * Points an uncopied placeholder at the incoming v4 user. Trial grants on that placeholder
 * belong to the user who lost the address, so they are removed and the incoming trial is written.
 */
async function replaceCaseVariant(
  accountId: number,
  source: V4IdentitySource,
  membership: V4MembershipDecision,
  now: Date
): Promise<void> {
  await getDataSourceReadWrite().transaction(async (manager) => {
    await manager
      .getRepository(Account)
      .update({ id: accountId }, { id_text: source.idText, verified: source.verified });
    await manager
      .getRepository(AccountCredentials)
      .update({ account_id: accountId }, { password: source.passwordHash });
    const profile = await manager
      .getRepository(AccountProfile)
      .createQueryBuilder('profile')
      .where('profile.account_id = :accountId', { accountId })
      .getOne();
    if (profile !== null) {
      profile.display_name = source.displayName;
      await manager.getRepository(AccountProfile).save(profile);
    }
    const account = await manager.getRepository(Account).findOne({ where: { id: accountId } });
    if (account === null) {
      throw new Error('Could not write the v5 identity.');
    }
    await ensureSignupRows(manager, account, membership, now);
    await manager.getRepository(BillingMembershipGrant).delete({
      account_id: accountId,
      source: 'trial',
    });
    await new BillingEntitlementService().setAccountMembershipWithManager(
      manager,
      accountId,
      membership.tier === 'premium' ? AccountMembershipEnum.Premium : AccountMembershipEnum.Trial
    );
    if (membership.carriedTrialEndsAt !== null) {
      await new BillingMembershipGrantService().insertWithManager(manager, {
        accountId,
        source: 'trial',
        startsAt: now,
        endsAt: membership.carriedTrialEndsAt,
      });
    }
    await new BillingEntitlementService().recomputeWithManager(manager, accountId, now);
  });
}

/**
 * Seeds one v4 identity into v5. The log line names the id and the action.
 */
export const v4SeedAccountIdentity = async (args: CommandLineArgs) => {
  if (hasOption(args, 'help')) {
    process.stdout.write(V4_SEED_ACCOUNT_IDENTITY_HELP);
    return;
  }

  const v4Id = optionValue(args, 'v4-id');
  if (v4Id === null) {
    throw new Error('Missing --v4-id. Run with --help for the flags.');
  }
  if (!isValidNanoIdV2IdText(v4Id)) {
    throw new Error('v4 id must be 7–15 characters.');
  }

  const connectionString = process.env.V4_DATABASE_URL?.trim() ?? '';
  if (connectionString === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }

  const dryRun = hasOption(args, 'dry-run');
  const sourceRow = await readV4Identity(connectionString, v4Id);
  const parsed = parseV4IdentityRow({
    idText: sourceRow.id_text,
    email: sourceRow.email,
    displayName: sourceRow.display_name,
    verified: sourceRow.verified,
    passwordHash: sourceRow.password_hash,
  });
  if (!parsed.ok) {
    getLogger().info('v4 identity seed finished', { dryRun, v4Id, action: parsed.reason });
    return;
  }
  if (parsed.source.idText !== v4Id) {
    throw new Error('v4 id did not match the requested id.');
  }

  const now = new Date();
  const membership = decideV4Membership({
    membershipExpiresAt: readV4Timestamp(sourceRow.membership_expires_at),
    freeTrialExpiresAt: readV4Timestamp(sourceRow.free_trial_expires_at),
    now,
  });
  const membershipLog = {
    tier: membership.tier,
    carriedTrial: membership.carriedTrialEndsAt !== null,
  };

  const emailAccountId = await findAccountIdByEmail(parsed.source.email);
  const idTextAccountId = await findAccountIdByIdText(v4Id);
  const decision: IdentitySeedAction = decideIdentitySeed({ emailAccountId, idTextAccountId });

  if (decision === 'skip_id_taken') {
    getLogger().info('v4 identity seed finished', {
      dryRun,
      v4Id,
      action: decision,
      ...membershipLog,
    });
    return;
  }

  if (decision === 'skip_existing_email') {
    if (emailAccountId === null) {
      throw new Error('Could not write the v5 identity.');
    }
    if (idTextAccountId !== null) {
      getLogger().info('v4 identity seed finished', {
        dryRun,
        v4Id,
        action: 'skip_id_taken',
        ...membershipLog,
      });
      return;
    }
    const resolution = await resolveCaseVariant({
      connectionString,
      accountId: emailAccountId,
      incomingIdText: parsed.source.idText,
      incomingEmail: parsed.source.email,
    });
    if (resolution.kind === 'unrelated' || resolution.kind === 'keep_current') {
      const action = resolution.kind === 'keep_current' ? 'skip_case_variant' : decision;
      getLogger().info('v4 identity seed finished', {
        dryRun,
        v4Id,
        action,
        ...(resolution.kind === 'keep_current' ? { otherV4Id: resolution.otherV4Id } : {}),
        ...membershipLog,
      });
      return;
    }
    if (resolution.kind === 'blocked_library' || resolution.kind === 'blocked_grants') {
      getLogger().info('v4 identity seed finished', {
        dryRun,
        v4Id,
        action: resolution.kind === 'blocked_library' ? 'skip_library_copied' : 'skip_has_grants',
        otherV4Id: resolution.otherV4Id,
        ...membershipLog,
      });
      return;
    }
    if (dryRun) {
      getLogger().info('v4 identity seed finished', {
        dryRun,
        v4Id,
        action: 'would_replace',
        otherV4Id: resolution.otherV4Id,
        ...membershipLog,
      });
      return;
    }
    try {
      await replaceCaseVariant(emailAccountId, parsed.source, membership, now);
    } catch (error) {
      if (!isPostgresUniqueViolation(error)) {
        throw new Error('Could not write the v5 identity.', { cause: error });
      }
      getLogger().info('v4 identity seed finished', {
        dryRun,
        v4Id,
        action: 'conflict',
        otherV4Id: resolution.otherV4Id,
        ...membershipLog,
      });
      return;
    }
    await new AccountNotificationPreferenceService().seedDefaultsForAccount(emailAccountId);
    getLogger().info('v4 identity seed finished', {
      dryRun,
      v4Id,
      action: 'replace',
      otherV4Id: resolution.otherV4Id,
      ...membershipLog,
    });
    return;
  }

  if (dryRun) {
    const action = decision === 'create' ? 'would_create' : 'would_repair';
    getLogger().info('v4 identity seed finished', { dryRun, v4Id, action, ...membershipLog });
    return;
  }

  let scaffold: ScaffoldResult;
  try {
    if (decision === 'repair') {
      if (emailAccountId === null) {
        throw new Error('Could not write the v5 identity.');
      }
      scaffold = await repairIdentity(emailAccountId, membership, now);
    } else {
      scaffold = await createIdentity(parsed.source, membership, now);
    }
  } catch (error) {
    if (!isPostgresUniqueViolation(error)) {
      throw new Error('Could not write the v5 identity.', { cause: error });
    }
    getLogger().info('v4 identity seed finished', {
      dryRun,
      v4Id,
      action: 'conflict',
      ...membershipLog,
    });
    return;
  }

  await new AccountNotificationPreferenceService().seedDefaultsForAccount(scaffold.accountId);

  const action = decision === 'create' ? 'create' : scaffold.wroteRows ? 'repair' : 'unchanged';
  getLogger().info('v4 identity seed finished', { dryRun, v4Id, action, ...membershipLog });
};
