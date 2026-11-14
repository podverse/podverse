/**
 * Returns v4 account ids and the rule that selected each one.
 * Account queries are SELECT only, on a UTC read-only session.
 * This module does not write a file or a status row.
 */

import { Client } from 'pg';

import { CARRIED_TRIAL_WINDOW_DAYS } from '../v4Identity/seedAccountIdentityLib.js';
import type { PilotMatchLists, StageAccountPick, StageName } from './pickStageAccountsLib.js';
import {
  ADD_BY_RSS_CAP_DEFAULT,
  DIRECTORY_FOLLOW_CAP_DEFAULT,
  LARGEST_QUERY_LIMIT,
  PLAYLIST_RESOURCE_CAP,
  REHEARSAL_V4_ID,
  SAMPLE_TARGET,
  SQL_MATCH_LIMIT,
  TWIN_GROUP_LIMIT,
  assembleStagePick,
} from './pickStageAccountsLib.js';

const KNOWN_MESSAGES = new Set<string>([
  'Could not read v4 accounts.',
  'Missing V4_DATABASE_URL.',
  'Unknown stage.',
  'Missing stage seed.',
  'Missing stage clock.',
]);

/** Subscriptions, followed playlists, followed accounts, or Add by RSS feeds. */
const HAS_LISTS_SQL = `cardinality(COALESCE(u."subscribedPodcastIds", ARRAY[]::varchar[])) > 0
    OR cardinality(COALESCE(u."subscribedPlaylistIds", ARRAY[]::varchar[])) > 0
    OR cardinality(COALESCE(u."subscribedUserIds", ARRAY[]::varchar[])) > 0
    OR cardinality(COALESCE(u."addByRSSPodcastFeedUrls", ARRAY[]::varchar[])) > 0`;

/** Episode rows plus clip rows on one playlist. */
const PLAYLIST_MEMBER_COUNTS_SQL = `
SELECT p."ownerId" AS owner_id,
       p.id AS playlist_id,
       COALESCE(ep.n, 0) + COALESCE(mr.n, 0) AS member_count
FROM playlists p
LEFT JOIN (
  SELECT "playlistsId", COUNT(*)::int AS n
  FROM playlists_episodes_episodes
  GROUP BY "playlistsId"
) ep ON ep."playlistsId" = p.id
LEFT JOIN (
  SELECT "playlistsId", COUNT(*)::int AS n
  FROM playlists_media_refs_media_refs
  GROUP BY "playlistsId"
) mr ON mr."playlistsId" = p.id`;

const REHEARSAL_SQL = `
SELECT id
FROM users
WHERE id = $1
`;

const LARGEST_ADD_BY_RSS_SQL = usersByArrayCount(
  distinctNonBlankCount('u."addByRSSPodcastFeedUrls"'),
  'counts.n > 0',
  'DESC',
  '$1'
);

const LARGEST_SUBSCRIPTIONS_SQL = usersByArrayCount(
  distinctNonBlankCount('u."subscribedPodcastIds"'),
  'counts.n > 0',
  'DESC',
  '$1'
);

const LARGEST_CLIPS_SQL = `
SELECT "ownerId" AS id
FROM "mediaRefs"
WHERE "ownerId" IS NOT NULL
  AND "isOfficialChapter" IS NOT TRUE
  AND "isOfficialSoundBite" IS NOT TRUE
GROUP BY "ownerId"
ORDER BY COUNT(*) DESC, "ownerId" ASC
LIMIT $1
`;

const LARGEST_HISTORY_SQL = largestOwnerCountSql('"userHistoryItems"');

const LARGEST_PLAYLISTS_SQL = largestOwnerCountSql('playlists');

const LARGEST_PLAYLIST_SIZE_SQL = `
SELECT sized.owner_id AS id
FROM (
${PLAYLIST_MEMBER_COUNTS_SQL}
) sized
WHERE sized.member_count > 0
ORDER BY sized.member_count DESC, sized.playlist_id ASC
LIMIT $1
`;

const JUST_OVER_ADD_BY_RSS_SQL = usersByArrayCount(
  distinctNonBlankCount('u."addByRSSPodcastFeedUrls"'),
  'counts.n > $1',
  'ASC',
  '$2'
);

const JUST_OVER_DIRECTORY_FOLLOWS_SQL = usersByArrayCount(
  `(${distinctNonBlankCount('u."subscribedPodcastIds"')})
    + (${distinctNonBlankCount('u."subscribedPlaylistIds"')})
    + (${distinctNonBlankCount('u."subscribedUserIds"')})`,
  'counts.n > $1',
  'ASC',
  '$2'
);

const JUST_OVER_PLAYLIST_SIZE_SQL = `
SELECT picked.owner_id AS id
FROM (
  SELECT sized.owner_id,
         sized.playlist_id,
         sized.member_count,
         ROW_NUMBER() OVER (
           PARTITION BY sized.owner_id
           ORDER BY sized.member_count ASC, sized.playlist_id ASC
         ) AS owner_rank
  FROM (
${PLAYLIST_MEMBER_COUNTS_SQL}
  ) sized
  WHERE sized.member_count > $1
) picked
WHERE picked.owner_rank = 1
ORDER BY picked.member_count ASC, picked.playlist_id ASC
LIMIT $2
`;

const EMAIL_CASE_TWIN_SQL = `
WITH keyed AS (
  SELECT id,
         lower(btrim(email)) AS email_key
  FROM users
  WHERE email IS NOT NULL
    AND btrim(email) <> ''
),
groups AS (
  SELECT email_key
  FROM keyed
  GROUP BY email_key
  HAVING COUNT(*) >= 2
  ORDER BY email_key ASC
  LIMIT $1
)
SELECT keyed.id
FROM keyed
JOIN groups ON groups.email_key = keyed.email_key
ORDER BY keyed.email_key ASC, keyed.id ASC
`;

const PAID_FAR_SQL = `
SELECT id
FROM users
WHERE "membershipExpiration" > $1::timestamptz + interval '5 years'
ORDER BY "membershipExpiration" ASC, id ASC
LIMIT 1
`;

const PAID_SOON_SQL = `
SELECT id
FROM users
WHERE "membershipExpiration" > $1::timestamptz
ORDER BY "membershipExpiration" ASC, id ASC
LIMIT $2
`;

const TRIAL_SQL = `
SELECT id
FROM users
WHERE "freeTrialExpiration" > $1::timestamptz
  AND "freeTrialExpiration" <= $1::timestamptz + ($2::int * interval '1 day')
  AND ("membershipExpiration" IS NULL OR "membershipExpiration" <= $1::timestamptz)
ORDER BY "freeTrialExpiration" ASC, id ASC
LIMIT $3
`;

const EXPIRED_SQL = `
SELECT id
FROM users
WHERE "membershipExpiration" IS NOT NULL
  AND "membershipExpiration" <= $1::timestamptz
ORDER BY "membershipExpiration" DESC, id ASC
LIMIT $2
`;

const UNVERIFIED_WITH_LISTS_SQL = `
SELECT u.id
FROM users u
WHERE u."emailVerified" IS NOT TRUE
  AND (
    ${HAS_LISTS_SQL}
  )
ORDER BY u."updatedAt" DESC NULLS LAST, u.id ASC
LIMIT $1
`;

const UNVERIFIED_WITHOUT_LISTS_SQL = `
SELECT u.id
FROM users u
WHERE u."emailVerified" IS NOT TRUE
  AND NOT (
    ${HAS_LISTS_SQL}
  )
ORDER BY u."updatedAt" DESC NULLS LAST, u.id ASC
LIMIT $1
`;

const FOLLOWS_ACCOUNT_SQL = usersByArrayCount(
  distinctNonBlankCount('u."subscribedUserIds"'),
  'counts.n > 0',
  'DESC',
  '$1'
);

const DEFAULT_PLAYLIST_SQL = `
SELECT u.id
FROM users u
WHERE EXISTS (
  SELECT 1
  FROM playlists p
  WHERE p."ownerId" = u.id
    AND p."isDefault" IS TRUE
)
ORDER BY u.id ASC
LIMIT $1
`;

const NO_ACTIVITY_SQL = `
SELECT u.id
FROM users u
WHERE NOT (
    ${HAS_LISTS_SQL}
  )
  AND NOT EXISTS (
    SELECT 1 FROM "userHistoryItems" activity WHERE activity."ownerId" = u.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM "userQueueItems" activity WHERE activity."ownerId" = u.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM "userNowPlayingItems" activity WHERE activity."ownerId" = u.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM playlists activity WHERE activity."ownerId" = u.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "mediaRefs" activity
    WHERE activity."ownerId" = u.id
      AND activity."isOfficialChapter" IS NOT TRUE
      AND activity."isOfficialSoundBite" IS NOT TRUE
  )
ORDER BY u.id ASC
LIMIT $1
`;

const PILOT_RANDOM_SQL = `
SELECT id
FROM users
ORDER BY md5(id || $1), id
`;

const SAMPLE_RANDOM_SQL = `
SELECT id
FROM users
ORDER BY md5(id || $1), id
LIMIT $2
`;

const FULL_SQL = `
SELECT id
FROM users
ORDER BY id ASC
`;

/** Distinct non-blank elements of one varchar array on `users u`. */
function distinctNonBlankCount(arraySql: string): string {
  return `SELECT COUNT(DISTINCT btrim(value))::int
    FROM unnest(COALESCE(${arraySql}, ARRAY[]::varchar[])) AS value
    WHERE btrim(value) <> ''`;
}

function usersByArrayCount(
  countSql: string,
  whereSql: string,
  direction: 'ASC' | 'DESC',
  limitParam: '$1' | '$2'
): string {
  return `
SELECT u.id
FROM users u
CROSS JOIN LATERAL (
  SELECT (${countSql}) AS n
) counts
WHERE ${whereSql}
ORDER BY counts.n ${direction}, u.id ASC
LIMIT ${limitParam}
`;
}

function largestOwnerCountSql(table: string): string {
  return `
SELECT "ownerId" AS id
FROM ${table}
WHERE "ownerId" IS NOT NULL
GROUP BY "ownerId"
ORDER BY COUNT(*) DESC, "ownerId" ASC
LIMIT $1
`;
}

function requireConnectionString(connectionString: string): string {
  const trimmed = connectionString.trim();
  if (trimmed === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }
  return trimmed;
}

function requireStage(stage: string): StageName {
  if (stage === 'pilot' || stage === 'sample' || stage === 'full') {
    return stage;
  }
  throw new Error('Unknown stage.');
}

function requireSeed(seed: string): string {
  const trimmed = seed.trim();
  if (trimmed === '') {
    throw new Error('Missing stage seed.');
  }
  return trimmed;
}

function requireNow(now: Date): Date {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('Missing stage clock.');
  }
  return now;
}

function rethrowOrWrap(error: unknown): never {
  if (error instanceof Error && KNOWN_MESSAGES.has(error.message)) {
    throw error;
  }
  throw new Error('Could not read v4 accounts.', { cause: error });
}

async function readIds(client: Client, sql: string, values: readonly unknown[]): Promise<string[]> {
  const result = await client.query<{ id: string }>(sql, values);
  return result.rows.map((row) => row.id);
}

async function readPilot(client: Client, seed: string, now: Date): Promise<StageAccountPick[]> {
  // Each query finishes before the next one starts on this client.
  const matches: PilotMatchLists = {
    rehearsal: await readIds(client, REHEARSAL_SQL, [REHEARSAL_V4_ID]),
    largest_add_by_rss: await readIds(client, LARGEST_ADD_BY_RSS_SQL, [LARGEST_QUERY_LIMIT]),
    largest_subscriptions: await readIds(client, LARGEST_SUBSCRIPTIONS_SQL, [LARGEST_QUERY_LIMIT]),
    largest_clips: await readIds(client, LARGEST_CLIPS_SQL, [LARGEST_QUERY_LIMIT]),
    largest_history: await readIds(client, LARGEST_HISTORY_SQL, [LARGEST_QUERY_LIMIT]),
    largest_playlists: await readIds(client, LARGEST_PLAYLISTS_SQL, [LARGEST_QUERY_LIMIT]),
    largest_playlist_size: await readIds(client, LARGEST_PLAYLIST_SIZE_SQL, [LARGEST_QUERY_LIMIT]),
    just_over_add_by_rss: await readIds(client, JUST_OVER_ADD_BY_RSS_SQL, [
      ADD_BY_RSS_CAP_DEFAULT,
      SQL_MATCH_LIMIT,
    ]),
    just_over_directory_follows: await readIds(client, JUST_OVER_DIRECTORY_FOLLOWS_SQL, [
      DIRECTORY_FOLLOW_CAP_DEFAULT,
      SQL_MATCH_LIMIT,
    ]),
    just_over_playlist_size: await readIds(client, JUST_OVER_PLAYLIST_SIZE_SQL, [
      PLAYLIST_RESOURCE_CAP,
      SQL_MATCH_LIMIT,
    ]),
    email_case_twin: await readIds(client, EMAIL_CASE_TWIN_SQL, [TWIN_GROUP_LIMIT]),
    paid_far: await readIds(client, PAID_FAR_SQL, [now]),
    paid_soon: await readIds(client, PAID_SOON_SQL, [now, SQL_MATCH_LIMIT]),
    trial: await readIds(client, TRIAL_SQL, [now, CARRIED_TRIAL_WINDOW_DAYS, SQL_MATCH_LIMIT]),
    expired: await readIds(client, EXPIRED_SQL, [now, SQL_MATCH_LIMIT]),
    unverified_with_lists: await readIds(client, UNVERIFIED_WITH_LISTS_SQL, [SQL_MATCH_LIMIT]),
    unverified_without_lists: await readIds(client, UNVERIFIED_WITHOUT_LISTS_SQL, [
      SQL_MATCH_LIMIT,
    ]),
    follows_account: await readIds(client, FOLLOWS_ACCOUNT_SQL, [SQL_MATCH_LIMIT]),
    default_playlist: await readIds(client, DEFAULT_PLAYLIST_SQL, [SQL_MATCH_LIMIT]),
    no_activity: await readIds(client, NO_ACTIVITY_SQL, [SQL_MATCH_LIMIT]),
  };
  const randomIds = await readIds(client, PILOT_RANDOM_SQL, [seed]);
  return assembleStagePick({ stage: 'pilot', matches, randomIds });
}

export async function pickStageAccounts(input: {
  connectionString: string;
  stage: StageName;
  seed: string;
  now: Date;
}): Promise<StageAccountPick[]> {
  const connectionString = requireConnectionString(input.connectionString);
  const stage = requireStage(input.stage);
  const seed = requireSeed(input.seed);
  const now = requireNow(input.now);

  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query("SET TIME ZONE 'UTC'");
    await client.query('SET default_transaction_read_only = on');
    if (stage === 'pilot') {
      return await readPilot(client, seed, now);
    }
    if (stage === 'sample') {
      const randomIds = await readIds(client, SAMPLE_RANDOM_SQL, [seed, SAMPLE_TARGET]);
      return assembleStagePick({ stage: 'sample', randomIds });
    }
    const fullIds = await readIds(client, FULL_SQL, []);
    return assembleStagePick({ stage: 'full', fullIds });
  } catch (error) {
    rethrowOrWrap(error);
  } finally {
    await client.end().catch(() => undefined);
  }
}
