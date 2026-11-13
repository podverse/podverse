const INT4_MAX = 2147483647;

export type LibraryCount = {
  total: number;
  resolved: number;
  unresolved: number;
  archivedItem: number;
  snapshot: number;
  notSeeded: number;
  dropped: number;
  /** Rows the copy records in `legacy_pending_row`. Overlaps the other counts; not in `total`. */
  pending: number;
};

export type LibraryCopyReport = {
  subscriptions: LibraryCount;
  addByRss: LibraryCount;
  followsPlaylist: LibraryCount;
  followsUser: LibraryCount;
  playlists: LibraryCount;
  playlistMembers: LibraryCount;
  playlistOrderDropped: number;
  clips: LibraryCount;
  clipsOfficialSkipped: number;
  queue: LibraryCount;
  history: LibraryCount;
  nowPlaying: LibraryCount;
};

export type V4PodcastKey = {
  id: string;
  podcastIndexId: string | null;
  podcastGuid: string | null;
  authorityUrl: string | null;
  isPublic: boolean;
  flagStatus: string | null;
  title?: string | null;
};

export type V4EpisodeKey = {
  id: string;
  podcastId: string | null;
  guid: string | null;
  mediaUrl: string | null;
  title: string | null;
  pubDate: string | null;
  isPublic: boolean;
};

export type V4MediaRefKey = {
  id: string;
  episodeId: string | null;
  official: boolean;
  owned: boolean;
  title?: string | null;
  description?: string | null;
  startTime?: number | null;
  endTime?: number | null;
  isPublic?: boolean;
};

export type V4PlaylistKey = {
  id: string;
  episodeIds: string[];
  mediaRefIds: string[];
  orderIds: string[];
  title?: string | null;
  description?: string | null;
  isPublic?: boolean;
  isDefault?: boolean;
  medium?: string | null;
};

export type V4PlaybackKey = {
  episodeId: string | null;
  mediaRefId: string | null;
  playbackPosition?: number | null;
  mediaFileDuration?: number | null;
  completed?: boolean;
  orderChangedDate?: string | null;
  queuePosition?: number | null;
};

export type V4LibrarySnapshot = {
  podcastIds: string[];
  podcasts: V4PodcastKey[];
  addByRssUrls: string[];
  playlistFollowIds: string[];
  userFollowIds: string[];
  playlists: V4PlaylistKey[];
  clips: V4MediaRefKey[];
  mediaRefs: V4MediaRefKey[];
  episodes: V4EpisodeKey[];
  queue: V4PlaybackKey[];
  history: V4PlaybackKey[];
  nowPlaying: V4PlaybackKey[];
};

export type LocalCatalog = {
  channelIdTexts: ReadonlySet<string>;
  channelByPodcastIndexId: ReadonlyMap<number, string>;
  channelByFeedUrl: ReadonlyMap<string, string>;
  channelByPodcastGuid: ReadonlyMap<string, string>;
  absorbSurvivorByPodcastIndexId: ReadonlyMap<number, string>;
  itemIdTexts: ReadonlySet<string>;
  itemGuidsByChannel: ReadonlyMap<string, ReadonlySet<string>>;
  itemEnclosuresByChannel: ReadonlyMap<string, ReadonlySet<string>>;
  itemTitlePubByChannel: ReadonlyMap<string, ReadonlySet<string>>;
  clipIdTexts: ReadonlySet<string>;
  playlistIdTexts: ReadonlySet<string>;
  accountIdTexts: ReadonlySet<string>;
  feedUrls: ReadonlySet<string>;
  /**
   * Channels whose feed parse has finished or failed and is not running. A clip or playlist
   * member with no item on one of these archives or snapshots; a later parse revives it.
   */
  attemptedChannelIdTexts: ReadonlySet<string>;
  /**
   * Channels whose feed is settled (`isV4MigrationFeedSettled`): a parse finished, or the
   * migration retries are used up or cancelled. Queue, history, and now playing drop for a
   * missing item only on one of these.
   */
  settledChannelIdTexts: ReadonlySet<string>;
};

/** Which parse state ends the wait for a missing item. */
type ParseReadiness = 'attempted' | 'settled';

export type PendingRowKind =
  | 'follow_account'
  | 'playlist_clip'
  | 'history'
  | 'queue'
  | 'now_playing'
  | 'snapshot_clip'
  | 'snapshot_playlist_member'
  | 'subscription';

export type PendingRowStatus = 'unresolved' | 'resolved' | 'dropped';

type CountKind = Exclude<keyof LibraryCount, 'total' | 'pending'>;

/**
 * What the copy can do with one v4 episode reference.
 * - resolved: a local item matches.
 * - waiting: the show will be seeded, or its feed has not reached the readiness the caller
 *   asked for. For clips and playlist members that is a first parse that finished or failed,
 *   and only while v4 still lists the episode. For playback it is a settled feed.
 * - archive: the show is local or will be seeded but v4 hid the episode because it left the
 *   feed. The copy creates an Archived item with the v4 id, guid, and enclosure, so a later
 *   parse reactivates it if the episode returns.
 * - gone: no v5 show will exist (missing, hidden, spam, or takedown podcast, or one with no
 *   authority URL to parse), the v4 episode row is missing, or it has neither a guid nor a
 *   media url.
 */
export type EpisodeDecision = 'resolved' | 'waiting' | 'archive' | 'gone';

type EpisodeOutcome = EpisodeDecision;

const UNSEEDED_FLAG_STATUSES: ReadonlySet<string> = new Set(['spam', 'takedown']);

function emptyCount(): LibraryCount {
  return {
    total: 0,
    resolved: 0,
    unresolved: 0,
    archivedItem: 0,
    snapshot: 0,
    notSeeded: 0,
    dropped: 0,
    pending: 0,
  };
}

function tally(count: LibraryCount, kind: CountKind, recordsPending = false): void {
  count.total += 1;
  count[kind] += 1;
  if (recordsPending) {
    count.pending += 1;
  }
}

/** A clip or playlist member is recorded while it waits, and as a snapshot to re-attach. */
function keptRowRecordsPending(kind: CountKind): boolean {
  return kind === 'unresolved' || kind === 'snapshot';
}

function blankToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * A Podcast Index id that fits the v5 integer column. Other text stays off that match.
 */
export function parsePodcastIndexId(value: string | null): number | null {
  const text = blankToNull(value);
  if (text === null || !/^(0|[1-9]\d*)$/.test(text)) {
    return null;
  }
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed > INT4_MAX) {
    return null;
  }
  return parsed;
}

/** UTC second, used for the title and pub date item match. */
export function pubDateSecond(value: string | null): string | null {
  const text = blankToNull(value);
  if (text === null) {
    return null;
  }
  const time = Date.parse(text);
  if (Number.isNaN(time)) {
    return null;
  }
  return String(Math.floor(time / 1000));
}

/**
 * The local channel a v4 podcast attaches to. An applied absorb merge wins.
 */
export function podcastChannelIdText(podcast: V4PodcastKey, catalog: LocalCatalog): string | null {
  const podcastIndexId = parsePodcastIndexId(podcast.podcastIndexId);
  if (podcastIndexId !== null) {
    const survivor = catalog.absorbSurvivorByPodcastIndexId.get(podcastIndexId);
    if (survivor !== undefined) {
      return survivor;
    }
  }
  if (catalog.channelIdTexts.has(podcast.id)) {
    return podcast.id;
  }
  if (podcastIndexId !== null) {
    const byPodcastIndex = catalog.channelByPodcastIndexId.get(podcastIndexId);
    if (byPodcastIndex !== undefined) {
      return byPodcastIndex;
    }
  }
  const authorityUrl = blankToNull(podcast.authorityUrl);
  if (authorityUrl !== null) {
    const byUrl = catalog.channelByFeedUrl.get(authorityUrl);
    if (byUrl !== undefined) {
      return byUrl;
    }
  }
  const podcastGuid = blankToNull(podcast.podcastGuid);
  if (podcastGuid !== null) {
    const byGuid = catalog.channelByPodcastGuid.get(podcastGuid);
    if (byGuid !== undefined) {
      return byGuid;
    }
  }
  return null;
}

/**
 * True when the catalog seed creates a v5 show for this podcast: public, not spam or
 * takedown, with a Podcast Index id that fits the v5 feed column.
 */
export function isSeedablePodcast(podcast: V4PodcastKey): boolean {
  if (!podcast.isPublic) {
    return false;
  }
  const flagStatus = blankToNull(podcast.flagStatus);
  if (flagStatus !== null && UNSEEDED_FLAG_STATUSES.has(flagStatus)) {
    return false;
  }
  return parsePodcastIndexId(podcast.podcastIndexId) !== null;
}

/** True when the catalog seed creates and parses this show, which also needs an authority URL. */
export function seedCreatesShow(podcast: V4PodcastKey): boolean {
  return isSeedablePodcast(podcast) && blankToNull(podcast.authorityUrl) !== null;
}

/**
 * Channel ids the snapshot can already see. Item lookup uses this list.
 */
export function matchedChannelIdTexts(
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog
): string[] {
  const channelIds = new Set<string>();
  for (const podcast of snapshot.podcasts) {
    const channelIdText = podcastChannelIdText(podcast, catalog);
    if (channelIdText !== null) {
      channelIds.add(channelIdText);
    }
  }
  return [...channelIds];
}

type ClassifyContext = {
  podcasts: ReadonlyMap<string, V4PodcastKey>;
  episodes: ReadonlyMap<string, V4EpisodeKey>;
  mediaRefs: ReadonlyMap<string, V4MediaRefKey>;
  podcastChannels: ReadonlyMap<string, string>;
  catalog: LocalCatalog;
};

function hasLocalItem(
  episode: V4EpisodeKey,
  channelIdText: string | null,
  catalog: LocalCatalog
): boolean {
  if (catalog.itemIdTexts.has(episode.id)) {
    return true;
  }
  if (channelIdText === null) {
    return false;
  }
  const guid = blankToNull(episode.guid);
  if (guid !== null && catalog.itemGuidsByChannel.get(channelIdText)?.has(guid) === true) {
    return true;
  }
  const mediaUrl = blankToNull(episode.mediaUrl);
  if (
    mediaUrl !== null &&
    catalog.itemEnclosuresByChannel.get(channelIdText)?.has(mediaUrl) === true
  ) {
    return true;
  }
  const title = blankToNull(episode.title);
  const pubSecond = pubDateSecond(episode.pubDate);
  return (
    title !== null &&
    pubSecond !== null &&
    catalog.itemTitlePubByChannel.get(channelIdText)?.has(`${title}\n${pubSecond}`) === true
  );
}

function episodeOutcome(
  episodeId: string | null,
  context: ClassifyContext,
  readiness: ParseReadiness
): EpisodeOutcome {
  const id = blankToNull(episodeId);
  const episode = id === null ? undefined : context.episodes.get(id);
  if (episode === undefined) {
    return 'gone';
  }
  const podcastId = blankToNull(episode.podcastId);
  const channelIdText =
    podcastId === null ? null : (context.podcastChannels.get(podcastId) ?? null);
  if (hasLocalItem(episode, channelIdText, context.catalog)) {
    return 'resolved';
  }
  const podcast = podcastId === null ? undefined : context.podcasts.get(podcastId);
  const showWillExist =
    channelIdText !== null || (podcast !== undefined && seedCreatesShow(podcast));
  if (!showWillExist) {
    return 'gone';
  }
  if (readiness === 'settled') {
    const settled =
      channelIdText !== null && context.catalog.settledChannelIdTexts.has(channelIdText);
    if (!settled) {
      return 'waiting';
    }
  } else if (episode.isPublic) {
    const attempted =
      channelIdText !== null && context.catalog.attemptedChannelIdTexts.has(channelIdText);
    if (!attempted) {
      return 'waiting';
    }
  }
  if (blankToNull(episode.guid) === null && blankToNull(episode.mediaUrl) === null) {
    return 'gone';
  }
  return 'archive';
}

/** A user clip or a playlist member is never dropped for a missing episode. */
function keptRowKind(outcome: EpisodeOutcome): CountKind {
  switch (outcome) {
    case 'resolved':
      return 'resolved';
    case 'waiting':
      return 'unresolved';
    case 'archive':
      return 'archivedItem';
    case 'gone':
      return 'snapshot';
  }
}

/**
 * v5 keeps queue, history, and now playing only for Active items
 * (`pruneNonActiveItemBackedQueueResourceRows`). The playback decision waits for a settled
 * feed, so a drop here means no further migration parse will create the item.
 */
function playbackRowKind(outcome: EpisodeOutcome): CountKind {
  switch (outcome) {
    case 'resolved':
      return 'resolved';
    case 'waiting':
      return 'unresolved';
    case 'archive':
    case 'gone':
      return 'dropped';
  }
}

function classifyPlayback(row: V4PlaybackKey, context: ClassifyContext): CountKind {
  const episodeId = blankToNull(row.episodeId);
  const mediaRefId = blankToNull(row.mediaRefId);
  if (mediaRefId !== null) {
    const mediaRef = context.mediaRefs.get(mediaRefId);
    if (mediaRef === undefined || mediaRef.official) {
      return episodeId === null
        ? 'dropped'
        : playbackRowKind(episodeOutcome(episodeId, context, 'settled'));
    }
    return playbackRowKind(episodeOutcome(mediaRef.episodeId ?? episodeId, context, 'settled'));
  }
  if (episodeId === null) {
    return 'dropped';
  }
  return playbackRowKind(episodeOutcome(episodeId, context, 'settled'));
}

/** The v4 id a playback row is recorded under: its clip when it has one, else its episode. */
export function playbackLegacyId(row: V4PlaybackKey): string | null {
  return blankToNull(row.mediaRefId) ?? blankToNull(row.episodeId);
}

function tallyPlayback(count: LibraryCount, row: V4PlaybackKey, context: ClassifyContext): void {
  const kind = classifyPlayback(row, context);
  tally(count, kind, kind !== 'resolved' && playbackLegacyId(row) !== null);
}

/**
 * The `legacy_pending_row` status for a playback row that has no Active item. Null when the
 * row is written.
 */
export function playbackPendingStatus(
  decision: EpisodeDecision
): { status: PendingRowStatus; reason: string } | null {
  switch (decision) {
    case 'resolved':
      return null;
    case 'waiting':
      return { status: 'unresolved', reason: 'waiting_parse' };
    case 'archive':
      return { status: 'dropped', reason: 'episode_left_feed' };
    case 'gone':
      return { status: 'dropped', reason: 'no_item' };
  }
}

/** The `legacy_pending_row` status for a subscription with no local channel. */
export function subscriptionPendingStatus(podcast: V4PodcastKey | undefined): {
  status: PendingRowStatus;
  reason: string;
} {
  if (podcast !== undefined && seedCreatesShow(podcast)) {
    return { status: 'unresolved', reason: 'waiting_seed' };
  }
  return { status: 'dropped', reason: 'not_seeded' };
}

/**
 * A clip in a playlist. The owner's own clip follows the clip rules. Another user's clip
 * exists in v5 only after that account is copied, so it waits for that copy.
 */
function classifyPlaylistClip(mediaRef: V4MediaRefKey, context: ClassifyContext): CountKind {
  if (mediaRef.official) {
    return 'dropped';
  }
  if (context.catalog.clipIdTexts.has(mediaRef.id)) {
    return 'resolved';
  }
  if (!mediaRef.owned) {
    return 'unresolved';
  }
  return keptRowKind(episodeOutcome(mediaRef.episodeId, context, 'attempted'));
}

function classifyIdList(
  ids: string[],
  present: ReadonlySet<string>,
  count: LibraryCount,
  recordsPending: boolean
): void {
  for (const id of ids) {
    const text = blankToNull(id);
    if (text === null) {
      tally(count, 'dropped');
      continue;
    }
    const resolved = present.has(text);
    tally(count, resolved ? 'resolved' : 'unresolved', recordsPending && !resolved);
  }
}

/**
 * Counts one v4 library against rows already in v5.
 * - resolved: a local row matches, or the account that owns a created playlist is local.
 * - unresolved: waits on a show the seed creates and parses, on a feed whose parse
 *   has not finished or failed yet (playback: a feed that is not settled), or on another
 *   account's copy.
 * - archivedItem: the episode left its feed; the copy creates an Archived item for it.
 * - snapshot: no v5 show or episode will exist; the clip or playlist row keeps
 *   `removed_source` with the v4 titles and dates.
 * - notSeeded: a subscription to a podcast the seed skips.
 * - dropped: not copied.
 * - pending: rows the copy records in `legacy_pending_row` for a later replay.
 */
export function classifyLibraryCopy(
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog
): LibraryCopyReport {
  const podcasts = new Map(snapshot.podcasts.map((podcast) => [podcast.id, podcast]));
  const episodes = new Map(snapshot.episodes.map((episode) => [episode.id, episode]));
  const mediaRefs = new Map(snapshot.mediaRefs.map((mediaRef) => [mediaRef.id, mediaRef]));
  const podcastChannels = new Map<string, string>();
  const context: ClassifyContext = { podcasts, episodes, mediaRefs, podcastChannels, catalog };
  for (const podcast of snapshot.podcasts) {
    const channelIdText = podcastChannelIdText(podcast, catalog);
    if (channelIdText !== null) {
      podcastChannels.set(podcast.id, channelIdText);
    }
  }

  const report: LibraryCopyReport = {
    subscriptions: emptyCount(),
    addByRss: emptyCount(),
    followsPlaylist: emptyCount(),
    followsUser: emptyCount(),
    playlists: emptyCount(),
    playlistMembers: emptyCount(),
    playlistOrderDropped: 0,
    clips: emptyCount(),
    clipsOfficialSkipped: 0,
    queue: emptyCount(),
    history: emptyCount(),
    nowPlaying: emptyCount(),
  };

  for (const podcastId of snapshot.podcastIds) {
    const text = blankToNull(podcastId);
    if (text === null) {
      tally(report.subscriptions, 'dropped');
      continue;
    }
    const podcast = podcasts.get(text);
    if (podcast === undefined) {
      tally(report.subscriptions, 'notSeeded', true);
      continue;
    }
    if (podcastChannels.has(podcast.id)) {
      tally(report.subscriptions, 'resolved');
      continue;
    }
    tally(report.subscriptions, seedCreatesShow(podcast) ? 'unresolved' : 'notSeeded', true);
  }

  for (const url of snapshot.addByRssUrls) {
    const text = blankToNull(url);
    if (text === null) {
      tally(report.addByRss, 'dropped');
      continue;
    }
    tally(report.addByRss, catalog.feedUrls.has(text) ? 'resolved' : 'unresolved');
  }

  classifyIdList(
    snapshot.playlistFollowIds,
    catalog.playlistIdTexts,
    report.followsPlaylist,
    false
  );
  classifyIdList(snapshot.userFollowIds, catalog.accountIdTexts, report.followsUser, true);

  for (const playlist of snapshot.playlists) {
    tally(report.playlists, 'resolved');
    const memberIds = new Set<string>();
    for (const episodeId of playlist.episodeIds) {
      const text = blankToNull(episodeId);
      if (text === null) {
        tally(report.playlistMembers, 'dropped');
        continue;
      }
      memberIds.add(text);
      const kind = keptRowKind(episodeOutcome(text, context, 'attempted'));
      tally(report.playlistMembers, kind, keptRowRecordsPending(kind));
    }
    for (const mediaRefId of playlist.mediaRefIds) {
      const text = blankToNull(mediaRefId);
      if (text === null) {
        tally(report.playlistMembers, 'dropped');
        continue;
      }
      memberIds.add(text);
      const mediaRef = mediaRefs.get(text);
      const kind = mediaRef === undefined ? 'dropped' : classifyPlaylistClip(mediaRef, context);
      // A clip member that was written points at its clip, whose own row carries any snapshot.
      tally(report.playlistMembers, kind, kind === 'unresolved');
    }
    for (const orderId of playlist.orderIds) {
      const text = blankToNull(orderId);
      if (text === null || !memberIds.has(text)) {
        report.playlistOrderDropped += 1;
      }
    }
  }

  for (const clip of snapshot.clips) {
    if (clip.official) {
      report.clipsOfficialSkipped += 1;
      continue;
    }
    if (catalog.clipIdTexts.has(clip.id)) {
      tally(report.clips, 'resolved');
      continue;
    }
    const kind = keptRowKind(episodeOutcome(clip.episodeId, context, 'attempted'));
    tally(report.clips, kind, keptRowRecordsPending(kind));
  }

  for (const row of snapshot.queue) {
    tallyPlayback(report.queue, row, context);
  }
  for (const row of snapshot.history) {
    tallyPlayback(report.history, row, context);
  }
  for (const row of snapshot.nowPlaying) {
    tallyPlayback(report.nowPlaying, row, context);
  }

  return report;
}

const LIST_POSITION_SCALE = 100000000;

/** `start` plus `index` steps of 0.00000001, as a numeric string. */
export function listPositionAt(start: number, index: number): string {
  const units = Math.round(start * LIST_POSITION_SCALE) + index;
  const sign = units < 0 ? '-' : '';
  const absolute = Math.abs(units);
  const whole = Math.floor(absolute / LIST_POSITION_SCALE);
  const fraction = String(absolute % LIST_POSITION_SCALE).padStart(8, '0');
  return `${sign}${whole}.${fraction}`;
}

/**
 * The same episode decision the counts use. The write attaches, waits, archives, or
 * snapshots from this and does not decide again. Clips and playlist members pass `attempted`;
 * queue, history, and now playing pass `settled`.
 */
export function episodeDecision(
  episodeId: string | null,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  readiness: ParseReadiness
): EpisodeDecision {
  const podcasts = new Map(snapshot.podcasts.map((podcast) => [podcast.id, podcast]));
  const episodes = new Map(snapshot.episodes.map((episode) => [episode.id, episode]));
  const podcastChannels = new Map<string, string>();
  for (const podcast of snapshot.podcasts) {
    const channelIdText = podcastChannelIdText(podcast, catalog);
    if (channelIdText !== null) {
      podcastChannels.set(podcast.id, channelIdText);
    }
  }
  return episodeOutcome(
    episodeId,
    {
      podcasts,
      episodes,
      mediaRefs: new Map(),
      podcastChannels,
      catalog,
    },
    readiness
  );
}
