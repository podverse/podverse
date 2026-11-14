import { Client } from 'pg';

import { AccountMembershipEnum } from '@podverse/helpers';
import { fetchWithTimeout } from '@podverse/helpers-backend';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation';
import { getDataSourceReadWrite, isValidNanoIdV2IdText } from '@podverse/orm';

import { decideV4Membership } from '../v4Identity/seedAccountIdentityLib.js';
import { assertLocalDatabase } from '../v4Library/copyAccountLibrary.js';

/** Add by RSS feeds kept when the stored column is null. The copy does not write this number. */
export const ADD_BY_RSS_DEFAULT_LIMIT = 100;

/** Tiers the copy may write. A stored number above the last tier still covers a count. */
export const ADD_BY_RSS_TIERS = [200, 300, 400, 500, 1000, 10000] as const;

/** Directory follows have no stored column. */
export const DIRECTORY_FOLLOW_DEFAULT_LIMIT = 500;

/** Counts above the last tier are left for an operator. There is no column to read. */
export const DIRECTORY_FOLLOW_TIERS = [1000, 2000, 3000, 4000, 5000, 10000] as const;

/** The playlist resource trigger allows this many rows and refuses the next insert. */
export const PLAYLIST_MEMBER_LIMIT = 10000;

const ONE_SECOND_MS = 1000;
const PUBLIC_PATH_TIMEOUT_MS = 10000;
const PUBLIC_PATH_MAX_BODY_BYTES = 1024;
const PUBLIC_SAMPLE_LIMIT = 3;
const REHEARSAL_SIGN_IN_ID = 'eFv5NFx';
const APP_STORE_WINDOW_START_MS = 1703635200000;
const APP_STORE_WINDOW_END_MS = 1706745600000;

const RESULT_ORDER = [
  'clip_dropped',
  'playlist_member_dropped',
  'cap_cut',
  'unaccounted',
  'cap_tier',
  'hash_mismatch',
  'verified_mismatch',
  'sign_in_rejected',
  'public_id',
  'public_path',
  'membership_mismatch',
  'needs_operator',
] as const;

export type VerifyAccountClass = (typeof RESULT_ORDER)[number];

export type VerifyAccountResult =
  | { ok: true }
  | {
      ok: false;
      class: VerifyAccountClass;
      group: string | null;
      exampleId: string | null;
      message: string;
    };

export type VerifyPendingRow = {
  rowKind: string;
  legacyId: string;
  status: string;
};

export type VerifyLegacyMapRow = {
  legacyKind: string;
  legacyId: string;
  v5Kind: string;
  v5IdText: string | null;
  status: string;
};

export type VerifyPlaylist = {
  id: string;
  isPublic: boolean;
  episodeIds: readonly string[];
  mediaRefIds: readonly string[];
};

export type VerifyMediaRef = {
  id: string;
  official: boolean;
  owned: boolean;
  isPublic: boolean;
};

export type VerifyPlaybackRow = {
  episodeId: string | null;
  mediaRefId: string | null;
};

export type VerifyGrant = {
  source: string;
  startsAt: Date;
  endsAt: Date;
  revokedAt: Date | null;
};

export type VerifyPlaylistResource = {
  playlistIdText: string;
  memberIdTexts: readonly string[];
};

export type JudgeAccountCompatibilityInput = {
  v4Id: string;
  accountIdText: string;
  now: Date;
  subscribedPodcastIds: readonly string[];
  subscribedPlaylistIds: readonly string[];
  subscribedUserIds: readonly string[];
  addByRssUrls: readonly string[];
  playlists: readonly VerifyPlaylist[];
  mediaRefs: readonly VerifyMediaRef[];
  playback: readonly VerifyPlaybackRow[];
  v4PasswordHash: string;
  v5PasswordHash: string;
  v4EmailVerified: boolean;
  v5Verified: boolean;
  membershipExpiration: Date | null;
  freeTrialExpiration: Date | null;
  accountMembershipId: number | null;
  membershipExpiresAt: Date | null;
  maxAddByRssFeeds: number | null;
  appStoreWindow: boolean;
  grants: readonly VerifyGrant[];
  followedChannelIdTexts: readonly string[];
  followedPlaylistIdTexts: readonly string[];
  followedAccountIdTexts: readonly string[];
  addByRssFeedUrls: readonly string[];
  playlistIdTexts: readonly string[];
  clipIdTexts: readonly string[];
  playlistResources: readonly VerifyPlaylistResource[];
  queueResourceIdTexts: readonly string[];
  pendingRows: readonly VerifyPendingRow[];
  legacyMap: readonly VerifyLegacyMapRow[];
};

export type VerifyAccountOptions = {
  now: Date;
  samplePublicPaths: boolean;
  webOrigin: string | null;
  rehearsalPassword: string | null;
  comparePassword: ((plain: string, hash: string) => Promise<boolean>) | null;
  requestPath?: (url: string) => Promise<{ status: number; location: string | null }>;
};

type AddByRssFacts = {
  count: number;
  canonicalUrls: readonly string[];
  stored: number | null;
  covers: boolean;
  hasFeedRow: boolean;
};

type PlaylistState = {
  id: string;
  isPublic: boolean;
  memberIds: readonly string[];
  overCap: boolean;
  hasRow: boolean;
  hasResource: boolean;
  hasPending: boolean;
};

type LibraryFacts = {
  addByRss: AddByRssFacts;
  directoryCount: number;
  directoryPartial: boolean;
  playlists: readonly PlaylistState[];
};

type PlaybackId = {
  id: string;
  kind: 'mediaRef' | 'episode';
};

const V4_USER_SQL = `
SELECT "subscribedPodcastIds" AS podcast_ids,
       "subscribedPlaylistIds" AS playlist_ids,
       "subscribedUserIds" AS user_ids,
       "addByRSSPodcastFeedUrls" AS add_by_rss_urls,
       password,
       ("emailVerified" IS TRUE) AS email_verified,
       to_char("membershipExpiration", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS membership_expires_at,
       to_char("freeTrialExpiration", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS free_trial_expires_at
FROM users
WHERE id = $1
`;

const V4_PLAYLIST_SQL = `
SELECT id,
       ("isPublic" IS TRUE) AS is_public
FROM playlists
WHERE "ownerId" = $1
`;

const V4_PLAYLIST_EPISODE_SQL = `
SELECT "playlistsId" AS playlist_id,
       "episodesId" AS episode_id
FROM playlists_episodes_episodes
WHERE "playlistsId" = ANY($1::varchar[])
`;

const V4_PLAYLIST_MEDIA_REF_SQL = `
SELECT "playlistsId" AS playlist_id,
       "mediaRefsId" AS media_ref_id
FROM playlists_media_refs_media_refs
WHERE "playlistsId" = ANY($1::varchar[])
`;

const V4_MEDIA_REF_SQL = `
SELECT id,
       ("isOfficialChapter" IS TRUE OR "isOfficialSoundBite" IS TRUE) AS official,
       ("ownerId" = $1) AS owned,
       ("isPublic" IS TRUE) AS is_public
FROM "mediaRefs"
WHERE "ownerId" = $1
   OR id = ANY($2::varchar[])
`;

const V4_QUEUE_SQL = `
SELECT "episodeId" AS episode_id,
       "mediaRefId" AS media_ref_id
FROM "userQueueItems"
WHERE "ownerId" = $1
`;

const V4_HISTORY_SQL = `
SELECT "episodeId" AS episode_id,
       "mediaRefId" AS media_ref_id
FROM "userHistoryItems"
WHERE "ownerId" = $1
`;

const V4_NOW_PLAYING_SQL = `
SELECT "episodeId" AS episode_id,
       "mediaRefId" AS media_ref_id
FROM "userNowPlayingItems"
WHERE "ownerId" = $1
`;

const V4_APP_STORE_SQL = `
SELECT 1 AS found
FROM "appStorePurchase"
WHERE "ownerId" = $1
  AND purchase_date_ms ~ '^[0-9]+$'
  AND purchase_date_ms::numeric >= ${APP_STORE_WINDOW_START_MS}
  AND purchase_date_ms::numeric < ${APP_STORE_WINDOW_END_MS}
LIMIT 1
`;

const V5_ACCOUNT_SQL = `
SELECT id, id_text, verified
FROM account
WHERE id_text = $1
`;

const V5_CREDENTIALS_SQL = `
SELECT password
FROM account_credentials
WHERE account_id = $1
`;

const V5_MEMBERSHIP_SQL = `
SELECT account_membership_id,
       to_char(membership_expires_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS membership_expires_at,
       max_add_by_rss_feeds
FROM account_membership_status
WHERE account_id = $1
`;

const V5_GRANT_SQL = `
SELECT source,
       to_char(starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS starts_at,
       to_char(ends_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ends_at,
       (revoked_at IS NULL) AS active
FROM billing_membership_grant
WHERE account_id = $1
`;

const V5_FOLLOWED_CHANNEL_SQL = `
SELECT c.id_text
FROM account_following_channel f
INNER JOIN channel c ON c.id = f.channel_id
WHERE f.account_id = $1
`;

const V5_FOLLOWED_PLAYLIST_SQL = `
SELECT p.id_text
FROM account_following_playlist f
INNER JOIN playlist p ON p.id = f.playlist_id
WHERE f.account_id = $1
`;

const V5_FOLLOWED_ACCOUNT_SQL = `
SELECT a.id_text
FROM account_following_account f
INNER JOIN account a ON a.id = f.following_account_id
WHERE f.account_id = $1
`;

const V5_ADD_BY_RSS_SQL = `
SELECT feed_url
FROM account_following_add_by_rss_channel
WHERE account_id = $1
`;

const V5_PLAYLIST_SQL = `
SELECT id_text
FROM playlist
WHERE id_text = ANY($1::varchar[])
`;

const V5_CLIP_SQL = `
SELECT id_text
FROM clip
WHERE account_id = $1
`;

const V5_PLAYLIST_RESOURCE_SQL = `
SELECT p.id_text AS playlist_id_text,
       i.id_text AS item_id_text,
       c.id_text AS clip_id_text
FROM playlist_resource r
INNER JOIN playlist p ON p.id = r.playlist_id
LEFT JOIN item i ON i.id = r.item_id
LEFT JOIN clip c ON c.id = r.clip_id
WHERE p.id_text = ANY($1::varchar[])
`;

const V5_QUEUE_RESOURCE_SQL = `
SELECT i.id_text AS item_id_text,
       c.id_text AS clip_id_text
FROM queue_resource r
INNER JOIN queue q ON q.id = r.queue_id
LEFT JOIN item i ON i.id = r.item_id
LEFT JOIN clip c ON c.id = r.clip_id
WHERE q.account_id = $1
`;

const V5_PENDING_SQL = `
SELECT row_kind, legacy_id, status
FROM legacy_pending_row
WHERE account_id = $1
`;

const V5_LEGACY_MAP_SQL = `
SELECT m.legacy_kind, m.legacy_id, m.v5_kind, m.v5_id_text, m.status
FROM legacy_id_map m
INNER JOIN unnest($1::text[], $2::text[]) AS wanted(legacy_kind, legacy_id)
  ON m.legacy_kind = wanted.legacy_kind
 AND m.legacy_id = wanted.legacy_id
`;

/** Statements the loader sends. They are selects of ids, flags, hashes, and expiries. */
export const V4_VERIFY_SQL = {
  user: V4_USER_SQL,
  playlist: V4_PLAYLIST_SQL,
  playlistEpisode: V4_PLAYLIST_EPISODE_SQL,
  playlistMediaRef: V4_PLAYLIST_MEDIA_REF_SQL,
  mediaRef: V4_MEDIA_REF_SQL,
  queue: V4_QUEUE_SQL,
  history: V4_HISTORY_SQL,
  nowPlaying: V4_NOW_PLAYING_SQL,
  appStore: V4_APP_STORE_SQL,
} as const;

/** v5 selects for one account. Pending context is not read. */
export const V5_VERIFY_SQL = {
  account: V5_ACCOUNT_SQL,
  credentials: V5_CREDENTIALS_SQL,
  membership: V5_MEMBERSHIP_SQL,
  grant: V5_GRANT_SQL,
  followedChannel: V5_FOLLOWED_CHANNEL_SQL,
  followedPlaylist: V5_FOLLOWED_PLAYLIST_SQL,
  followedAccount: V5_FOLLOWED_ACCOUNT_SQL,
  addByRss: V5_ADD_BY_RSS_SQL,
  playlist: V5_PLAYLIST_SQL,
  clip: V5_CLIP_SQL,
  playlistResource: V5_PLAYLIST_RESOURCE_SQL,
  queueResource: V5_QUEUE_RESOURCE_SQL,
  pending: V5_PENDING_SQL,
  legacyMap: V5_LEGACY_MAP_SQL,
} as const;

type V4VerifySource = {
  podcastIds: string[];
  playlistIds: string[];
  userIds: string[];
  addByRssUrls: string[];
  passwordHash: string;
  emailVerified: boolean;
  membershipExpiration: Date | null;
  freeTrialExpiration: Date | null;
  playlists: VerifyPlaylist[];
  mediaRefs: VerifyMediaRef[];
  playback: VerifyPlaybackRow[];
  appStoreWindow: boolean;
};

type V5AccountRow = {
  id: number;
  idText: string;
  verified: boolean;
};

type V5VerifySource = {
  passwordHash: string;
  accountMembershipId: number | null;
  membershipExpiresAt: Date | null;
  maxAddByRssFeeds: number | null;
  grants: VerifyGrant[];
  followedChannelIdTexts: string[];
  followedPlaylistIdTexts: string[];
  followedAccountIdTexts: string[];
  addByRssFeedUrls: string[];
  playlistIdTexts: string[];
  clipIdTexts: string[];
  playlistResources: VerifyPlaylistResource[];
  queueResourceIdTexts: string[];
  pendingRows: VerifyPendingRow[];
  legacyMap: VerifyLegacyMapRow[];
};

function lastTier(tiers: readonly number[], fallback: number): number {
  const last = tiers[tiers.length - 1];
  return last === undefined ? fallback : last;
}

const ADD_BY_RSS_CAP_MAX = lastTier(ADD_BY_RSS_TIERS, ADD_BY_RSS_DEFAULT_LIMIT);
const DIRECTORY_FOLLOW_CAP_MAX = lastTier(DIRECTORY_FOLLOW_TIERS, DIRECTORY_FOLLOW_DEFAULT_LIMIT);

function failure(
  verifyClass: VerifyAccountClass,
  group: string | null,
  exampleId: string | null,
  message: string
): VerifyAccountResult {
  return { ok: false, class: verifyClass, group, exampleId, message };
}

function resultRank(verifyClass: VerifyAccountClass): number {
  const rank = RESULT_ORDER.indexOf(verifyClass);
  return rank === -1 ? RESULT_ORDER.length : rank;
}

function trimmed(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = value.trim();
  return text === '' ? null : text;
}

function distinctText(values: readonly string[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const id = trimmed(value);
    if (id === null || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function textSet(values: readonly string[]): Set<string> {
  return new Set(distinctText(values));
}

function hasText(values: readonly string[]): boolean {
  return values.some((value) => trimmed(value) !== null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowsOf(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' ? trimmed(value) : null;
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function flag(value: unknown): boolean {
  return value === true;
}

function passwordText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function integerOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function dateOrNull(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

function storedNumber(value: number | null): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function withinOneSecond(left: Date, right: Date): boolean {
  return Math.abs(left.getTime() - right.getTime()) <= ONE_SECOND_MS;
}

function addUtcYears(date: Date, years: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear() + years,
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

function countAddByRss(urls: readonly string[]): { count: number; canonicalUrls: string[] } {
  const seen = new Set<string>();
  const canonicalUrls: string[] = [];
  const canonicalSeen = new Set<string>();
  for (const url of urls) {
    const raw = trimmed(url);
    if (raw === null) {
      continue;
    }
    const canonical = canonicalAddByRSSFeedUrl(raw);
    const key = canonical === null ? `raw\n${raw}` : `url\n${canonical}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (canonical !== null && !canonicalSeen.has(canonical)) {
      canonicalSeen.add(canonical);
      canonicalUrls.push(canonical);
    }
  }
  return { count: seen.size, canonicalUrls };
}

function mediaRefMap(mediaRefs: readonly VerifyMediaRef[]): Map<string, VerifyMediaRef> {
  const map = new Map<string, VerifyMediaRef>();
  for (const mediaRef of mediaRefs) {
    const id = trimmed(mediaRef.id);
    if (id === null || map.has(id)) {
      continue;
    }
    map.set(id, mediaRef);
  }
  return map;
}

function playlistMemberIds(
  playlist: VerifyPlaylist,
  mediaRefs: ReadonlyMap<string, VerifyMediaRef>
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const add = (value: string) => {
    const id = trimmed(value);
    if (id === null || seen.has(id)) {
      return;
    }
    seen.add(id);
    ids.push(id);
  };
  for (const episodeId of playlist.episodeIds) {
    add(episodeId);
  }
  for (const mediaRefId of playlist.mediaRefIds) {
    const id = trimmed(mediaRefId);
    if (id === null) {
      continue;
    }
    const mediaRef = mediaRefs.get(id);
    if (mediaRef === undefined || mediaRef.official) {
      continue;
    }
    add(id);
  }
  return ids;
}

function userClipIds(mediaRefs: readonly VerifyMediaRef[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const mediaRef of mediaRefs) {
    const id = trimmed(mediaRef.id);
    if (id === null || !mediaRef.owned || mediaRef.official || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function directoryFollowCount(input: JudgeAccountCompatibilityInput): number {
  return (
    distinctText(input.subscribedPodcastIds).length +
    distinctText(input.subscribedPlaylistIds).length +
    distinctText(input.subscribedUserIds).length
  );
}

function directoryPartial(input: JudgeAccountCompatibilityInput): boolean {
  if (
    hasText(input.followedChannelIdTexts) ||
    hasText(input.followedPlaylistIdTexts) ||
    hasText(input.followedAccountIdTexts)
  ) {
    return true;
  }
  return input.pendingRows.some(
    (row) => row.rowKind === 'subscription' || row.rowKind === 'follow_account'
  );
}

function buildPlaylistStates(input: JudgeAccountCompatibilityInput): PlaylistState[] {
  const mediaRefs = mediaRefMap(input.mediaRefs);
  const playlistRows = textSet(input.playlistIdTexts);
  const resources = new Set(
    input.playlistResources
      .map((resource) => trimmed(resource.playlistIdText))
      .filter((id): id is string => id !== null)
  );
  const states: PlaylistState[] = [];
  const seen = new Set<string>();
  for (const playlist of input.playlists) {
    const id = trimmed(playlist.id);
    if (id === null || seen.has(id)) {
      continue;
    }
    seen.add(id);
    const memberIds = playlistMemberIds(playlist, mediaRefs);
    const prefix = `${id}:`;
    states.push({
      id,
      isPublic: playlist.isPublic,
      memberIds,
      overCap: memberIds.length > PLAYLIST_MEMBER_LIMIT,
      hasRow: playlistRows.has(id),
      hasResource: resources.has(id),
      hasPending: input.pendingRows.some((row) => row.legacyId.startsWith(prefix)),
    });
  }
  return states;
}

function buildFacts(input: JudgeAccountCompatibilityInput): LibraryFacts {
  const counted = countAddByRss(input.addByRssUrls);
  const stored = storedNumber(input.maxAddByRssFeeds);
  return {
    addByRss: {
      count: counted.count,
      canonicalUrls: counted.canonicalUrls,
      stored,
      covers: stored !== null && stored >= counted.count,
      hasFeedRow: hasText(input.addByRssFeedUrls),
    },
    directoryCount: directoryFollowCount(input),
    directoryPartial: directoryPartial(input),
    playlists: buildPlaylistStates(input),
  };
}

function addByRssOverCap(facts: AddByRssFacts): boolean {
  return facts.count > ADD_BY_RSS_CAP_MAX;
}

function addByRssUncovered(facts: AddByRssFacts): boolean {
  return addByRssOverCap(facts) && !facts.covers;
}

function clipDropped(input: JudgeAccountCompatibilityInput): VerifyAccountResult | null {
  const clips = new Set(userClipIds(input.mediaRefs));
  for (const row of input.pendingRows) {
    const legacyId = trimmed(row.legacyId);
    if (
      row.rowKind === 'snapshot_clip' &&
      row.status === 'dropped' &&
      legacyId !== null &&
      clips.has(legacyId)
    ) {
      return failure('clip_dropped', 'clips', legacyId, 'clips dropped');
    }
  }
  return null;
}

function splitPlaylistMember(legacyId: string): { playlistId: string; memberId: string } | null {
  const separator = legacyId.indexOf(':');
  if (separator <= 0 || separator === legacyId.length - 1) {
    return null;
  }
  return {
    playlistId: legacyId.slice(0, separator),
    memberId: legacyId.slice(separator + 1),
  };
}

function playlistMemberDropped(
  input: JudgeAccountCompatibilityInput,
  facts: LibraryFacts
): VerifyAccountResult | null {
  const copied = new Map<string, Set<string>>();
  for (const playlist of facts.playlists) {
    if (!playlist.overCap) {
      copied.set(playlist.id, new Set(playlist.memberIds));
    }
  }
  for (const row of input.pendingRows) {
    if (
      row.status !== 'dropped' ||
      (row.rowKind !== 'snapshot_playlist_member' && row.rowKind !== 'playlist_clip')
    ) {
      continue;
    }
    const parts = splitPlaylistMember(row.legacyId.trim());
    if (parts === null) {
      continue;
    }
    const members = copied.get(parts.playlistId);
    if (members !== undefined && members.has(parts.memberId)) {
      return failure(
        'playlist_member_dropped',
        'playlistMembers',
        parts.memberId,
        'playlistMembers dropped'
      );
    }
  }
  return null;
}

function capCut(facts: LibraryFacts): VerifyAccountResult | null {
  if (addByRssUncovered(facts.addByRss) && facts.addByRss.hasFeedRow) {
    return failure(
      'cap_cut',
      'addByRss',
      null,
      `addByRss ${facts.addByRss.count} v4, feeds written`
    );
  }
  if (facts.directoryCount > DIRECTORY_FOLLOW_CAP_MAX && facts.directoryPartial) {
    return failure(
      'cap_cut',
      'directoryFollows',
      null,
      `directoryFollows ${facts.directoryCount} v4`
    );
  }
  for (const playlist of facts.playlists) {
    if (playlist.overCap && (playlist.hasRow || playlist.hasResource || playlist.hasPending)) {
      return failure(
        'cap_cut',
        'playlists',
        playlist.id,
        `playlists ${playlist.memberIds.length} v4`
      );
    }
  }
  return null;
}

function countCovered(
  ids: readonly string[],
  covered: (id: string) => boolean
): { covered: number; missing: string | null } {
  let coveredCount = 0;
  let missing: string | null = null;
  for (const id of ids) {
    if (covered(id)) {
      coveredCount += 1;
    } else if (missing === null) {
      missing = id;
    }
  }
  return { covered: coveredCount, missing };
}

function unaccountedResult(
  group: string,
  ids: readonly string[],
  covered: (id: string) => boolean,
  exampleId: (id: string) => string | null
): VerifyAccountResult | null {
  const result = countCovered(ids, covered);
  if (result.missing === null) {
    return null;
  }
  return failure(
    'unaccounted',
    group,
    exampleId(result.missing),
    `${group} ${ids.length} v4, ${result.covered} covered`
  );
}

function mappedV5(
  rows: readonly VerifyLegacyMapRow[],
  legacyKind: string,
  legacyId: string
): string | null {
  for (const row of rows) {
    if (row.legacyKind === legacyKind && row.legacyId === legacyId) {
      return trimmed(row.v5IdText);
    }
  }
  return null;
}

function pendingCovers(
  rows: readonly VerifyPendingRow[],
  kinds: readonly string[],
  legacyId: string,
  allowDropped: boolean
): boolean {
  return rows.some(
    (row) =>
      kinds.includes(row.rowKind) &&
      row.legacyId === legacyId &&
      (allowDropped || row.status !== 'dropped')
  );
}

function resourceIdsByPlaylist(input: JudgeAccountCompatibilityInput): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const resource of input.playlistResources) {
    const playlistId = trimmed(resource.playlistIdText);
    if (playlistId === null) {
      continue;
    }
    const ids = map.get(playlistId) ?? new Set<string>();
    for (const memberId of resource.memberIdTexts) {
      const id = trimmed(memberId);
      if (id !== null) {
        ids.add(id);
      }
    }
    map.set(playlistId, ids);
  }
  return map;
}

function distinctPlayback(rows: readonly VerifyPlaybackRow[]): PlaybackId[] {
  const order: string[] = [];
  const kinds = new Map<string, 'mediaRef' | 'episode'>();
  for (const row of rows) {
    const mediaRefId = trimmed(row.mediaRefId);
    const episodeId = trimmed(row.episodeId);
    const id = mediaRefId ?? episodeId;
    if (id === null) {
      continue;
    }
    const kind = mediaRefId !== null ? 'mediaRef' : 'episode';
    const existing = kinds.get(id);
    if (existing === undefined) {
      kinds.set(id, kind);
      order.push(id);
      continue;
    }
    if (kind === 'mediaRef') {
      kinds.set(id, 'mediaRef');
    }
  }
  return order.map((id) => ({ id, kind: kinds.get(id) ?? 'episode' }));
}

function unaccountedFollows(
  input: JudgeAccountCompatibilityInput,
  facts: LibraryFacts
): VerifyAccountResult | null {
  if (facts.directoryCount > DIRECTORY_FOLLOW_CAP_MAX) {
    return null;
  }
  const channels = textSet(input.followedChannelIdTexts);
  const subscriptions = unaccountedResult(
    'subscriptions',
    distinctText(input.subscribedPodcastIds),
    (id) => {
      if (channels.has(id)) {
        return true;
      }
      const mapped = mappedV5(input.legacyMap, 'podcast', id);
      if (mapped !== null && channels.has(mapped)) {
        return true;
      }
      return pendingCovers(input.pendingRows, ['subscription'], id, true);
    },
    (id) => id
  );
  if (subscriptions !== null) {
    return subscriptions;
  }
  const playlists = unaccountedResult(
    'followsPlaylist',
    distinctText(input.subscribedPlaylistIds),
    (id) => textSet(input.followedPlaylistIdTexts).has(id),
    (id) => id
  );
  if (playlists !== null) {
    return playlists;
  }
  const users = distinctText(input.subscribedUserIds).filter((id) => id !== input.v4Id);
  return unaccountedResult(
    'followsUser',
    users,
    (id) =>
      textSet(input.followedAccountIdTexts).has(id) ||
      pendingCovers(input.pendingRows, ['follow_account'], id, true),
    (id) => id
  );
}

function unaccountedLibrary(
  input: JudgeAccountCompatibilityInput,
  facts: LibraryFacts
): VerifyAccountResult | null {
  if (!addByRssUncovered(facts.addByRss)) {
    const feeds = textSet(input.addByRssFeedUrls);
    const addByRss = unaccountedResult(
      'addByRss',
      facts.addByRss.canonicalUrls,
      (url) => feeds.has(url),
      () => null
    );
    if (addByRss !== null) {
      return addByRss;
    }
  }
  const playlistIds = facts.playlists
    .filter((playlist) => !playlist.overCap)
    .map((playlist) => playlist.id);
  const playlists = unaccountedResult(
    'playlists',
    playlistIds,
    (id) => facts.playlists.some((playlist) => playlist.id === id && playlist.hasRow),
    (id) => id
  );
  if (playlists !== null) {
    return playlists;
  }
  const resources = resourceIdsByPlaylist(input);
  const memberKeys: string[] = [];
  for (const playlist of facts.playlists) {
    if (playlist.overCap || !playlist.hasRow) {
      continue;
    }
    for (const memberId of playlist.memberIds) {
      memberKeys.push(`${playlist.id}:${memberId}`);
    }
  }
  const members = unaccountedResult(
    'playlistMembers',
    memberKeys,
    (key) => {
      const parts = splitPlaylistMember(key);
      if (parts === null) {
        return false;
      }
      const written = resources.get(parts.playlistId);
      if (written !== undefined && written.has(parts.memberId)) {
        return true;
      }
      const episodeMapped = mappedV5(input.legacyMap, 'episode', parts.memberId);
      const mediaMapped = mappedV5(input.legacyMap, 'mediaRef', parts.memberId);
      if (
        written !== undefined &&
        ((episodeMapped !== null && written.has(episodeMapped)) ||
          (mediaMapped !== null && written.has(mediaMapped)))
      ) {
        return true;
      }
      return pendingCovers(
        input.pendingRows,
        ['snapshot_playlist_member', 'playlist_clip'],
        key,
        false
      );
    },
    (key) => splitPlaylistMember(key)?.memberId ?? null
  );
  if (members !== null) {
    return members;
  }
  const clips = textSet(input.clipIdTexts);
  const clipResult = unaccountedResult(
    'clips',
    userClipIds(input.mediaRefs),
    (id) => clips.has(id) || pendingCovers(input.pendingRows, ['snapshot_clip'], id, false),
    (id) => id
  );
  if (clipResult !== null) {
    return clipResult;
  }
  const queueIds = textSet(input.queueResourceIdTexts);
  const playback = distinctPlayback(input.playback);
  return unaccountedResult(
    'playback',
    playback.map((row) => row.id),
    (id) => {
      if (queueIds.has(id)) {
        return true;
      }
      const row = playback.find((item) => item.id === id);
      const mapped = row === undefined ? null : mappedV5(input.legacyMap, row.kind, id);
      if (mapped !== null && queueIds.has(mapped)) {
        return true;
      }
      return pendingCovers(input.pendingRows, ['queue', 'history', 'now_playing'], id, true);
    },
    (id) => id
  );
}

function unaccounted(
  input: JudgeAccountCompatibilityInput,
  facts: LibraryFacts
): VerifyAccountResult | null {
  return unaccountedFollows(input, facts) ?? unaccountedLibrary(input, facts);
}

function capTier(facts: LibraryFacts): VerifyAccountResult | null {
  const { count, stored } = facts.addByRss;
  if (count > ADD_BY_RSS_CAP_MAX) {
    return null;
  }
  const storedText = stored === null ? 'null' : String(stored);
  if (count <= ADD_BY_RSS_DEFAULT_LIMIT) {
    if (stored !== null && stored < count) {
      return failure('cap_tier', 'addByRss', null, `addByRss ${count} v4, stored ${storedText}`);
    }
    return null;
  }
  if (stored === null || stored < count) {
    return failure('cap_tier', 'addByRss', null, `addByRss ${count} v4, stored ${storedText}`);
  }
  return null;
}

function signInFields(input: JudgeAccountCompatibilityInput): VerifyAccountResult | null {
  if (input.v4PasswordHash !== input.v5PasswordHash) {
    return failure('hash_mismatch', 'signIn', input.v4Id, 'hash');
  }
  if (input.v4EmailVerified !== input.v5Verified) {
    return failure('verified_mismatch', 'signIn', input.v4Id, 'verified');
  }
  return null;
}

function mapMatches(
  rows: readonly VerifyLegacyMapRow[],
  legacyKind: string,
  legacyId: string,
  v5Kind: string
): boolean {
  return rows.some(
    (row) =>
      row.legacyKind === legacyKind &&
      row.legacyId === legacyId &&
      row.v5Kind === v5Kind &&
      row.v5IdText === legacyId &&
      row.status === 'mapped'
  );
}

function publicId(
  input: JudgeAccountCompatibilityInput,
  facts: LibraryFacts
): VerifyAccountResult | null {
  if (
    input.accountIdText !== input.v4Id ||
    !mapMatches(input.legacyMap, 'user', input.v4Id, 'account')
  ) {
    return failure('public_id', 'publicId', input.v4Id, 'user');
  }
  const playlistIds = facts.playlists
    .filter((playlist) => !playlist.overCap && playlist.hasRow)
    .map((playlist) => playlist.id)
    .sort();
  for (const id of playlistIds) {
    if (!mapMatches(input.legacyMap, 'playlist', id, 'playlist')) {
      return failure('public_id', 'publicId', id, 'playlist');
    }
  }
  const clips = textSet(input.clipIdTexts);
  const clipIds = userClipIds(input.mediaRefs)
    .filter((id) => clips.has(id))
    .sort();
  for (const id of clipIds) {
    if (!mapMatches(input.legacyMap, 'mediaRef', id, 'clip')) {
      return failure('public_id', 'publicId', id, 'mediaRef');
    }
  }
  return null;
}

function expectedLegacyEnd(input: JudgeAccountCompatibilityInput, startsAt: Date): Date | null {
  const expiry = input.membershipExpiration;
  if (expiry === null) {
    return null;
  }
  if (!input.appStoreWindow) {
    return expiry;
  }
  const capped = addUtcYears(startsAt, 5);
  if (expiry.getTime() > capped.getTime()) {
    return capped;
  }
  return expiry;
}

function laterDate(dates: readonly Date[]): Date | null {
  let later: Date | null = null;
  for (const date of dates) {
    if (later === null || date.getTime() > later.getTime()) {
      later = date;
    }
  }
  return later;
}

function membership(input: JudgeAccountCompatibilityInput): VerifyAccountResult | null {
  const decision = decideV4Membership({
    membershipExpiresAt: input.membershipExpiration,
    freeTrialExpiresAt: input.freeTrialExpiration,
    now: input.now,
  });
  const expectedTier =
    decision.tier === 'premium' ? AccountMembershipEnum.Premium : AccountMembershipEnum.Trial;
  if (input.accountMembershipId !== expectedTier) {
    return failure('membership_mismatch', 'membership', input.v4Id, 'tier');
  }
  const active = input.grants.filter((grant) => grant.revokedAt === null);
  if (active.some((grant) => grant.source !== 'trial' && grant.source !== 'legacy_import')) {
    return failure('membership_mismatch', 'membership', input.v4Id, 'other_grant');
  }
  const legacy = active.filter((grant) => grant.source === 'legacy_import');
  const trials = active.filter((grant) => grant.source === 'trial');
  if (decision.tier === 'premium') {
    const grant = legacy[0];
    if (legacy.length !== 1 || grant === undefined) {
      return failure('membership_mismatch', 'membership', input.v4Id, 'legacy_import');
    }
    const expectedEnd = expectedLegacyEnd(input, grant.startsAt);
    if (expectedEnd === null || !withinOneSecond(grant.endsAt, expectedEnd)) {
      return failure('membership_mismatch', 'membership', input.v4Id, 'ends_at');
    }
  } else if (legacy.length !== 0) {
    return failure('membership_mismatch', 'membership', input.v4Id, 'legacy_import');
  }
  if (decision.carriedTrialEndsAt !== null) {
    const grant = trials[0];
    if (
      trials.length !== 1 ||
      grant === undefined ||
      !withinOneSecond(grant.endsAt, decision.carriedTrialEndsAt)
    ) {
      return failure('membership_mismatch', 'membership', input.v4Id, 'trial');
    }
  } else if (trials.length !== 0) {
    return failure('membership_mismatch', 'membership', input.v4Id, 'trial');
  }
  const later = laterDate([
    ...legacy.map((grant) => grant.endsAt),
    ...trials.map((grant) => grant.endsAt),
  ]);
  if (later === null) {
    if (input.membershipExpiresAt !== null) {
      return failure('membership_mismatch', 'membership', input.v4Id, 'membership_expires_at');
    }
  } else if (
    input.membershipExpiresAt === null ||
    !withinOneSecond(input.membershipExpiresAt, later)
  ) {
    return failure('membership_mismatch', 'membership', input.v4Id, 'membership_expires_at');
  }
  return null;
}

function needsOperator(facts: LibraryFacts): VerifyAccountResult | null {
  if (addByRssUncovered(facts.addByRss) && !facts.addByRss.hasFeedRow) {
    return failure('needs_operator', 'addByRss', null, `addByRss ${facts.addByRss.count} v4`);
  }
  if (facts.directoryCount > DIRECTORY_FOLLOW_CAP_MAX && !facts.directoryPartial) {
    return failure(
      'needs_operator',
      'directoryFollows',
      null,
      `directoryFollows ${facts.directoryCount} v4`
    );
  }
  for (const playlist of facts.playlists) {
    if (playlist.overCap && !playlist.hasRow && !playlist.hasResource && !playlist.hasPending) {
      return failure(
        'needs_operator',
        'playlists',
        playlist.id,
        `playlists ${playlist.memberIds.length} v4`
      );
    }
  }
  return null;
}

/**
 * Pass or the first compatibility failure for one copied account.
 * The message is counts and a group name. It does not include an email, a name,
 * a password hash, a feed URL, a title, or a database URL.
 */
export function judgeAccountCompatibility(
  input: JudgeAccountCompatibilityInput
): VerifyAccountResult {
  const facts = buildFacts(input);
  const droppedClip = clipDropped(input);
  if (droppedClip !== null) {
    return droppedClip;
  }
  const droppedMember = playlistMemberDropped(input, facts);
  if (droppedMember !== null) {
    return droppedMember;
  }
  const cut = capCut(facts);
  if (cut !== null) {
    return cut;
  }
  const missing = unaccounted(input, facts);
  if (missing !== null) {
    return missing;
  }
  const tier = capTier(facts);
  if (tier !== null) {
    return tier;
  }
  const signIn = signInFields(input);
  if (signIn !== null) {
    return signIn;
  }
  const publicRow = publicId(input, facts);
  if (publicRow !== null) {
    return publicRow;
  }
  const membershipResult = membership(input);
  if (membershipResult !== null) {
    return membershipResult;
  }
  const operator = needsOperator(facts);
  if (operator !== null) {
    return operator;
  }
  return { ok: true };
}

function locationPathname(location: string): string | null {
  try {
    return new URL(location).pathname;
  } catch {
    try {
      return new URL(location, 'http://localhost').pathname;
    } catch {
      return null;
    }
  }
}

/**
 * Whether one sampled playlist or clip response shows that public page.
 * A redirect passes when its path is the requested path or one segment is the id.
 */
export function judgePublicPath(input: {
  id: string;
  requestedPath: string;
  status: number;
  location: string | null;
}): VerifyAccountResult {
  if (input.status >= 200 && input.status <= 299) {
    return { ok: true };
  }
  if (input.status >= 300 && input.status <= 399 && input.location !== null) {
    const pathname = locationPathname(input.location);
    const segments =
      pathname === null ? [] : pathname.split('/').filter((segment) => segment !== '');
    if (
      pathname !== null &&
      (pathname === input.requestedPath || (input.id !== '' && segments.includes(input.id)))
    ) {
      return { ok: true };
    }
  }
  return failure('public_path', 'publicId', input.id, `${input.requestedPath} ${input.status}`);
}

/**
 * Written public playlists and clips to sample, playlists first. At most three of each,
 * sorted by id. Profile paths are not included.
 */
export function selectPublicSamplePaths(input: JudgeAccountCompatibilityInput): string[] {
  const facts = buildFacts(input);
  const playlistIds = facts.playlists
    .filter((playlist) => playlist.isPublic && playlist.hasRow && !playlist.overCap)
    .map((playlist) => playlist.id)
    .sort()
    .slice(0, PUBLIC_SAMPLE_LIMIT);
  const clips = textSet(input.clipIdTexts);
  const clipIds = distinctText(
    input.mediaRefs
      .filter((mediaRef) => {
        const id = trimmed(mediaRef.id);
        return (
          id !== null && mediaRef.owned && !mediaRef.official && mediaRef.isPublic && clips.has(id)
        );
      })
      .map((mediaRef) => mediaRef.id)
  )
    .sort()
    .slice(0, PUBLIC_SAMPLE_LIMIT);
  return [...playlistIds.map((id) => `/playlist/${id}`), ...clipIds.map((id) => `/clip/${id}`)];
}

async function requestPublicPath(
  url: string
): Promise<{ status: number; location: string | null }> {
  const response = await fetchWithTimeout(url, {
    redirect: 'manual',
    timeoutMs: PUBLIC_PATH_TIMEOUT_MS,
    maxBodyBytes: PUBLIC_PATH_MAX_BODY_BYTES,
  });
  try {
    return { status: response.status, location: response.headers.get('location') };
  } finally {
    await response.body?.cancel().catch(() => undefined);
  }
}

function stripOneTrailingSlash(origin: string): string {
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

async function samplePublicPaths(
  input: JudgeAccountCompatibilityInput,
  origin: string,
  requestPath: (url: string) => Promise<{ status: number; location: string | null }>
): Promise<VerifyAccountResult> {
  for (const requestedPath of selectPublicSamplePaths(input)) {
    const id =
      requestedPath
        .split('/')
        .filter((segment) => segment !== '')
        .pop() ?? '';
    try {
      const response = await requestPath(`${origin}${requestedPath}`);
      const judged = judgePublicPath({
        id,
        requestedPath,
        status: response.status,
        location: response.location,
      });
      if (!judged.ok) {
        return judged;
      }
    } catch {
      return failure('public_path', 'publicId', id, `${requestedPath} error`);
    }
  }
  return { ok: true };
}

async function queryV4(
  client: Client,
  sql: string,
  values: readonly unknown[]
): Promise<Record<string, unknown>[]> {
  const result = await client.query<Record<string, unknown>>(sql, values);
  return result.rows;
}

async function queryV5(
  sql: string,
  values: readonly unknown[]
): Promise<Record<string, unknown>[]> {
  const result: unknown = await getDataSourceReadWrite().query(sql, [...values]);
  return rowsOf(result);
}

function idsForPlaylist(
  rows: Record<string, unknown>[],
  playlistId: string,
  column: string
): string[] {
  const ids: string[] = [];
  for (const row of rows) {
    if (textOrNull(row.playlist_id) !== playlistId) {
      continue;
    }
    const id = textOrNull(row[column]);
    if (id !== null) {
      ids.push(id);
    }
  }
  return ids;
}

function playbackFrom(rows: Record<string, unknown>[]): VerifyPlaybackRow[] {
  return rows.map((row) => ({
    episodeId: textOrNull(row.episode_id),
    mediaRefId: textOrNull(row.media_ref_id),
  }));
}

async function readV4(connectionString: string, v4Id: string): Promise<V4VerifySource | null> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const users = await queryV4(client, V4_USER_SQL, [v4Id]);
    const user = users[0];
    if (users.length !== 1 || user === undefined) {
      return null;
    }
    const playlistRows = await queryV4(client, V4_PLAYLIST_SQL, [v4Id]);
    const playlistIds = playlistRows
      .map((row) => textOrNull(row.id))
      .filter((id): id is string => id !== null);
    const episodeRows =
      playlistIds.length === 0 ? [] : await queryV4(client, V4_PLAYLIST_EPISODE_SQL, [playlistIds]);
    const mediaRefJoinRows =
      playlistIds.length === 0
        ? []
        : await queryV4(client, V4_PLAYLIST_MEDIA_REF_SQL, [playlistIds]);
    const joinIds = distinctText(mediaRefJoinRows.map((row) => textOrNull(row.media_ref_id) ?? ''));
    const mediaRefRows = await queryV4(client, V4_MEDIA_REF_SQL, [v4Id, joinIds]);
    const queueRows = await queryV4(client, V4_QUEUE_SQL, [v4Id]);
    const historyRows = await queryV4(client, V4_HISTORY_SQL, [v4Id]);
    const nowPlayingRows = await queryV4(client, V4_NOW_PLAYING_SQL, [v4Id]);
    const appStoreRows = await queryV4(client, V4_APP_STORE_SQL, [v4Id]);
    const playlists: VerifyPlaylist[] = [];
    for (const row of playlistRows) {
      const id = textOrNull(row.id);
      if (id === null) {
        continue;
      }
      playlists.push({
        id,
        isPublic: flag(row.is_public),
        episodeIds: idsForPlaylist(episodeRows, id, 'episode_id'),
        mediaRefIds: idsForPlaylist(mediaRefJoinRows, id, 'media_ref_id'),
      });
    }
    const mediaRefs: VerifyMediaRef[] = [];
    for (const row of mediaRefRows) {
      const id = textOrNull(row.id);
      if (id === null) {
        continue;
      }
      mediaRefs.push({
        id,
        official: flag(row.official),
        owned: flag(row.owned),
        isPublic: flag(row.is_public),
      });
    }
    return {
      podcastIds: textList(user.podcast_ids),
      playlistIds: textList(user.playlist_ids),
      userIds: textList(user.user_ids),
      addByRssUrls: textList(user.add_by_rss_urls),
      passwordHash: passwordText(user.password),
      emailVerified: flag(user.email_verified),
      membershipExpiration: dateOrNull(user.membership_expires_at),
      freeTrialExpiration: dateOrNull(user.free_trial_expires_at),
      playlists,
      mediaRefs,
      playback: [
        ...playbackFrom(queueRows),
        ...playbackFrom(historyRows),
        ...playbackFrom(nowPlayingRows),
      ],
      appStoreWindow: appStoreRows.length > 0,
    };
  } catch (error) {
    throw new Error('Could not read the v4 account.', { cause: error });
  } finally {
    await client.end().catch(() => undefined);
  }
}

function idTexts(rows: Record<string, unknown>[], column = 'id_text'): string[] {
  const ids: string[] = [];
  for (const row of rows) {
    const id = textOrNull(row[column]);
    if (id !== null) {
      ids.push(id);
    }
  }
  return ids;
}

function playlistResourcesFrom(rows: Record<string, unknown>[]): VerifyPlaylistResource[] {
  const order: string[] = [];
  const members = new Map<string, string[]>();
  for (const row of rows) {
    const playlistId = textOrNull(row.playlist_id_text);
    if (playlistId === null) {
      continue;
    }
    let list = members.get(playlistId);
    if (list === undefined) {
      list = [];
      members.set(playlistId, list);
      order.push(playlistId);
    }
    const itemId = textOrNull(row.item_id_text);
    const clipId = textOrNull(row.clip_id_text);
    if (itemId !== null) {
      list.push(itemId);
    }
    if (clipId !== null) {
      list.push(clipId);
    }
  }
  return order.map((playlistIdText) => ({
    playlistIdText,
    memberIdTexts: members.get(playlistIdText) ?? [],
  }));
}

function queueResourceIds(rows: Record<string, unknown>[]): string[] {
  const ids: string[] = [];
  for (const row of rows) {
    const itemId = textOrNull(row.item_id_text);
    const clipId = textOrNull(row.clip_id_text);
    if (itemId !== null) {
      ids.push(itemId);
    }
    if (clipId !== null) {
      ids.push(clipId);
    }
  }
  return ids;
}

function pendingFrom(rows: Record<string, unknown>[]): VerifyPendingRow[] {
  const pending: VerifyPendingRow[] = [];
  for (const row of rows) {
    const rowKind = textOrNull(row.row_kind);
    const legacyId = textOrNull(row.legacy_id);
    const status = textOrNull(row.status);
    if (rowKind === null || legacyId === null || status === null) {
      continue;
    }
    pending.push({ rowKind, legacyId, status });
  }
  return pending;
}

function legacyMapFrom(rows: Record<string, unknown>[]): VerifyLegacyMapRow[] {
  const mapped: VerifyLegacyMapRow[] = [];
  for (const row of rows) {
    const legacyKind = textOrNull(row.legacy_kind);
    const legacyId = textOrNull(row.legacy_id);
    const v5Kind = textOrNull(row.v5_kind);
    const status = textOrNull(row.status);
    if (legacyKind === null || legacyId === null || v5Kind === null || status === null) {
      continue;
    }
    mapped.push({
      legacyKind,
      legacyId,
      v5Kind,
      v5IdText: textOrNull(row.v5_id_text),
      status,
    });
  }
  return mapped;
}

function grantsFrom(rows: Record<string, unknown>[]): VerifyGrant[] {
  const grants: VerifyGrant[] = [];
  for (const row of rows) {
    const source = textOrNull(row.source);
    const startsAt = dateOrNull(row.starts_at);
    const endsAt = dateOrNull(row.ends_at);
    if (source === null || startsAt === null || endsAt === null) {
      continue;
    }
    grants.push({
      source,
      startsAt,
      endsAt,
      revokedAt: flag(row.active) ? null : new Date(0),
    });
  }
  return grants;
}

function legacyMapKeys(v4Id: string, source: V4VerifySource): { kinds: string[]; ids: string[] } {
  const seen = new Set<string>();
  const kinds: string[] = [];
  const ids: string[] = [];
  const add = (kind: string, id: string) => {
    const trimmedId = trimmed(id);
    if (trimmedId === null) {
      return;
    }
    const key = `${kind}\n${trimmedId}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    kinds.push(kind);
    ids.push(trimmedId);
  };
  add('user', v4Id);
  for (const id of source.podcastIds) {
    add('podcast', id);
  }
  for (const playlist of source.playlists) {
    add('playlist', playlist.id);
    for (const episodeId of playlist.episodeIds) {
      add('episode', episodeId);
    }
    for (const mediaRefId of playlist.mediaRefIds) {
      add('mediaRef', mediaRefId);
    }
  }
  for (const mediaRef of source.mediaRefs) {
    if (mediaRef.owned && !mediaRef.official) {
      add('mediaRef', mediaRef.id);
    }
  }
  for (const row of distinctPlayback(source.playback)) {
    add(row.kind, row.id);
  }
  return { kinds, ids };
}

async function readV5Account(v4Id: string): Promise<V5AccountRow | null> {
  let rows: Record<string, unknown>[];
  try {
    rows = await queryV5(V5_ACCOUNT_SQL, [v4Id]);
  } catch (error) {
    throw new Error('Could not read the v5 account.', { cause: error });
  }
  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  const id = integerOrNull(row.id);
  const idText = textOrNull(row.id_text);
  if (id === null || idText === null) {
    throw new Error('Could not read the v5 account.');
  }
  return { id, idText, verified: flag(row.verified) };
}

async function readV5(
  accountId: number,
  source: V4VerifySource,
  v4Id: string
): Promise<V5VerifySource> {
  try {
    const playlistIds = distinctText(source.playlists.map((playlist) => playlist.id));
    const mapKeys = legacyMapKeys(v4Id, source);
    const [
      credentials,
      membershipRows,
      grantRows,
      channels,
      followedPlaylists,
      followedAccounts,
      feeds,
      playlists,
      clips,
      resources,
      queueResources,
      pendingRows,
      mapRows,
    ] = await Promise.all([
      queryV5(V5_CREDENTIALS_SQL, [accountId]),
      queryV5(V5_MEMBERSHIP_SQL, [accountId]),
      queryV5(V5_GRANT_SQL, [accountId]),
      queryV5(V5_FOLLOWED_CHANNEL_SQL, [accountId]),
      queryV5(V5_FOLLOWED_PLAYLIST_SQL, [accountId]),
      queryV5(V5_FOLLOWED_ACCOUNT_SQL, [accountId]),
      queryV5(V5_ADD_BY_RSS_SQL, [accountId]),
      playlistIds.length === 0
        ? Promise.resolve<Record<string, unknown>[]>([])
        : queryV5(V5_PLAYLIST_SQL, [playlistIds]),
      queryV5(V5_CLIP_SQL, [accountId]),
      playlistIds.length === 0
        ? Promise.resolve<Record<string, unknown>[]>([])
        : queryV5(V5_PLAYLIST_RESOURCE_SQL, [playlistIds]),
      queryV5(V5_QUEUE_RESOURCE_SQL, [accountId]),
      queryV5(V5_PENDING_SQL, [accountId]),
      queryV5(V5_LEGACY_MAP_SQL, [mapKeys.kinds, mapKeys.ids]),
    ]);
    const membershipRow = membershipRows[0];
    const credential = credentials[0];
    return {
      passwordHash: credential === undefined ? '' : passwordText(credential.password),
      accountMembershipId:
        membershipRow === undefined ? null : integerOrNull(membershipRow.account_membership_id),
      membershipExpiresAt:
        membershipRow === undefined ? null : dateOrNull(membershipRow.membership_expires_at),
      maxAddByRssFeeds:
        membershipRow === undefined ? null : integerOrNull(membershipRow.max_add_by_rss_feeds),
      grants: grantsFrom(grantRows),
      followedChannelIdTexts: idTexts(channels),
      followedPlaylistIdTexts: idTexts(followedPlaylists),
      followedAccountIdTexts: idTexts(followedAccounts),
      addByRssFeedUrls: idTexts(feeds, 'feed_url'),
      playlistIdTexts: idTexts(playlists),
      clipIdTexts: idTexts(clips),
      playlistResources: playlistResourcesFrom(resources),
      queueResourceIdTexts: queueResourceIds(queueResources),
      pendingRows: pendingFrom(pendingRows),
      legacyMap: legacyMapFrom(mapRows),
    };
  } catch (error) {
    throw new Error('Could not read the v5 account.', { cause: error });
  }
}

function buildInput(
  v4Id: string,
  account: V5AccountRow,
  v4: V4VerifySource,
  v5: V5VerifySource,
  now: Date
): JudgeAccountCompatibilityInput {
  return {
    v4Id,
    accountIdText: account.idText,
    now,
    subscribedPodcastIds: v4.podcastIds,
    subscribedPlaylistIds: v4.playlistIds,
    subscribedUserIds: v4.userIds,
    addByRssUrls: v4.addByRssUrls,
    playlists: v4.playlists,
    mediaRefs: v4.mediaRefs,
    playback: v4.playback,
    v4PasswordHash: v4.passwordHash,
    v5PasswordHash: v5.passwordHash,
    v4EmailVerified: v4.emailVerified,
    v5Verified: account.verified,
    membershipExpiration: v4.membershipExpiration,
    freeTrialExpiration: v4.freeTrialExpiration,
    accountMembershipId: v5.accountMembershipId,
    membershipExpiresAt: v5.membershipExpiresAt,
    maxAddByRssFeeds: v5.maxAddByRssFeeds,
    appStoreWindow: v4.appStoreWindow,
    grants: v5.grants,
    followedChannelIdTexts: v5.followedChannelIdTexts,
    followedPlaylistIdTexts: v5.followedPlaylistIdTexts,
    followedAccountIdTexts: v5.followedAccountIdTexts,
    addByRssFeedUrls: v5.addByRssFeedUrls,
    playlistIdTexts: v5.playlistIdTexts,
    clipIdTexts: v5.clipIdTexts,
    playlistResources: v5.playlistResources,
    queueResourceIdTexts: v5.queueResourceIdTexts,
    pendingRows: v5.pendingRows,
    legacyMap: v5.legacyMap,
  };
}

/**
 * Loads one account from the local v5 database and the v4 database and returns
 * the first compatibility failure. Writes nothing.
 */
export async function verifyAccount(
  v4Id: string,
  options: VerifyAccountOptions
): Promise<VerifyAccountResult> {
  assertLocalDatabase();
  if (!isValidNanoIdV2IdText(v4Id)) {
    throw new Error('v4 id must be 7–15 characters.');
  }
  const connectionString = process.env.V4_DATABASE_URL?.trim() ?? '';
  if (connectionString === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }
  const v4 = await readV4(connectionString, v4Id);
  if (v4 === null) {
    throw new Error('No v4 account for that id.');
  }
  const account = await readV5Account(v4Id);
  if (account === null) {
    return failure('unaccounted', 'account', v4Id, 'no v5 account');
  }
  const origin = options.webOrigin?.trim() ?? '';
  if (options.samplePublicPaths && origin === '') {
    throw new Error('Missing web origin for the public path sample.');
  }
  const hasPassword = options.rehearsalPassword !== null;
  const hasCompare = options.comparePassword !== null;
  if (hasPassword !== hasCompare) {
    throw new Error('Password sign-in needs both the password and the compare function.');
  }
  const v5 = await readV5(account.id, v4, v4Id);
  const input = buildInput(v4Id, account, v4, v5, options.now);
  const judged = judgeAccountCompatibility(input);
  if (!judged.ok && resultRank(judged.class) < resultRank('sign_in_rejected')) {
    return judged;
  }
  if (
    v4Id === REHEARSAL_SIGN_IN_ID &&
    options.rehearsalPassword !== null &&
    options.comparePassword !== null
  ) {
    const passwordMatches = await options.comparePassword(
      options.rehearsalPassword,
      v5.passwordHash
    );
    if (!passwordMatches) {
      return failure('sign_in_rejected', 'signIn', v4Id, 'rejected');
    }
  }
  if (!judged.ok && resultRank(judged.class) < resultRank('public_path')) {
    return judged;
  }
  if (options.samplePublicPaths) {
    const requestPath = options.requestPath ?? requestPublicPath;
    const sampled = await samplePublicPaths(input, stripOneTrailingSlash(origin), requestPath);
    if (!sampled.ok) {
      return sampled;
    }
  }
  return judged;
}
