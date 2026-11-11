const INT4_MAX = 2147483647;

export type LibraryCount = {
  total: number;
  resolved: number;
  unresolved: number;
  keptWithoutItem: number;
  dropped: number;
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
};

export type V4EpisodeKey = {
  id: string;
  podcastId: string | null;
  guid: string | null;
  mediaUrl: string | null;
  title: string | null;
  pubDate: string | null;
};

export type V4MediaRefKey = {
  id: string;
  episodeId: string | null;
  official: boolean;
};

export type V4PlaylistKey = {
  id: string;
  episodeIds: string[];
  mediaRefIds: string[];
  orderIds: string[];
};

export type V4PlaybackKey = {
  episodeId: string | null;
  mediaRefId: string | null;
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
};

type CountKind = 'resolved' | 'unresolved' | 'keptWithoutItem' | 'dropped';

type EpisodeMatch = 'resolved' | 'missing' | 'unresolved';

function emptyCount(): LibraryCount {
  return { total: 0, resolved: 0, unresolved: 0, keptWithoutItem: 0, dropped: 0 };
}

function tally(count: LibraryCount, kind: CountKind): void {
  count.total += 1;
  count[kind] += 1;
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
export function podcastChannelIdText(
  podcast: V4PodcastKey,
  catalog: LocalCatalog
): string | null {
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

function episodeMatch(
  episodeId: string | null,
  episodes: ReadonlyMap<string, V4EpisodeKey>,
  podcastChannels: ReadonlyMap<string, string>,
  catalog: LocalCatalog
): EpisodeMatch {
  const id = blankToNull(episodeId);
  if (id === null) {
    return 'missing';
  }
  const episode = episodes.get(id);
  if (episode === undefined) {
    return 'missing';
  }
  if (catalog.itemIdTexts.has(episode.id)) {
    return 'resolved';
  }
  const podcastId = blankToNull(episode.podcastId);
  const channelIdText = podcastId === null ? null : (podcastChannels.get(podcastId) ?? null);
  if (channelIdText === null) {
    return 'unresolved';
  }
  const guid = blankToNull(episode.guid);
  if (guid !== null && catalog.itemGuidsByChannel.get(channelIdText)?.has(guid) === true) {
    return 'resolved';
  }
  const mediaUrl = blankToNull(episode.mediaUrl);
  if (
    mediaUrl !== null &&
    catalog.itemEnclosuresByChannel.get(channelIdText)?.has(mediaUrl) === true
  ) {
    return 'resolved';
  }
  const title = blankToNull(episode.title);
  const pubSecond = pubDateSecond(episode.pubDate);
  if (
    title !== null &&
    pubSecond !== null &&
    catalog.itemTitlePubByChannel.get(channelIdText)?.has(`${title}\n${pubSecond}`) === true
  ) {
    return 'resolved';
  }
  return 'unresolved';
}

function classifyPlayback(
  row: V4PlaybackKey,
  mediaRefs: ReadonlyMap<string, V4MediaRefKey>,
  episodes: ReadonlyMap<string, V4EpisodeKey>,
  podcastChannels: ReadonlyMap<string, string>,
  catalog: LocalCatalog
): CountKind {
  const episodeId = blankToNull(row.episodeId);
  const mediaRefId = blankToNull(row.mediaRefId);
  if (episodeId === null && mediaRefId === null) {
    return 'dropped';
  }
  if (
    episodeId !== null &&
    episodeMatch(episodeId, episodes, podcastChannels, catalog) === 'resolved'
  ) {
    return 'resolved';
  }
  if (mediaRefId === null) {
    return 'unresolved';
  }
  const mediaRef = mediaRefs.get(mediaRefId);
  if (mediaRef === undefined || mediaRef.official) {
    return 'unresolved';
  }
  if (catalog.clipIdTexts.has(mediaRef.id)) {
    return 'resolved';
  }
  const mediaEpisode = episodeMatch(mediaRef.episodeId, episodes, podcastChannels, catalog);
  if (mediaEpisode === 'resolved') {
    return 'resolved';
  }
  if (mediaEpisode === 'missing') {
    return 'keptWithoutItem';
  }
  return 'unresolved';
}

function classifyIdList(
  ids: string[],
  present: ReadonlySet<string>,
  count: LibraryCount
): void {
  for (const id of ids) {
    const text = blankToNull(id);
    if (text === null) {
      tally(count, 'dropped');
      continue;
    }
    tally(count, present.has(text) ? 'resolved' : 'unresolved');
  }
}

/**
 * Counts one v4 library against rows already in v5. Resolved means a local row
 * matches, or the account that will own a created playlist is already local.
 * Unresolved means the catalog row is not local yet. A clip whose episode is
 * already gone is kept without an item. Dropped rows are not copied.
 */
export function classifyLibraryCopy(
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog
): LibraryCopyReport {
  const podcasts = new Map(snapshot.podcasts.map((podcast) => [podcast.id, podcast]));
  const episodes = new Map(snapshot.episodes.map((episode) => [episode.id, episode]));
  const mediaRefs = new Map(snapshot.mediaRefs.map((mediaRef) => [mediaRef.id, mediaRef]));
  const podcastChannels = new Map<string, string>();
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
      tally(report.subscriptions, 'unresolved');
      continue;
    }
    tally(report.subscriptions, podcastChannels.has(podcast.id) ? 'resolved' : 'unresolved');
  }

  for (const url of snapshot.addByRssUrls) {
    const text = blankToNull(url);
    if (text === null) {
      tally(report.addByRss, 'dropped');
      continue;
    }
    tally(report.addByRss, catalog.feedUrls.has(text) ? 'resolved' : 'unresolved');
  }

  classifyIdList(snapshot.playlistFollowIds, catalog.playlistIdTexts, report.followsPlaylist);
  classifyIdList(snapshot.userFollowIds, catalog.accountIdTexts, report.followsUser);

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
      const match = episodeMatch(text, episodes, podcastChannels, catalog);
      tally(report.playlistMembers, match === 'resolved' ? 'resolved' : 'unresolved');
    }
    for (const mediaRefId of playlist.mediaRefIds) {
      const text = blankToNull(mediaRefId);
      if (text === null) {
        tally(report.playlistMembers, 'dropped');
        continue;
      }
      memberIds.add(text);
      const mediaRef = mediaRefs.get(text);
      if (mediaRef === undefined) {
        tally(report.playlistMembers, 'unresolved');
        continue;
      }
      if (mediaRef.official) {
        tally(report.playlistMembers, 'dropped');
        continue;
      }
      if (catalog.clipIdTexts.has(mediaRef.id)) {
        tally(report.playlistMembers, 'resolved');
        continue;
      }
      const match = episodeMatch(mediaRef.episodeId, episodes, podcastChannels, catalog);
      if (match === 'resolved') {
        tally(report.playlistMembers, 'resolved');
      } else if (match === 'missing') {
        tally(report.playlistMembers, 'keptWithoutItem');
      } else {
        tally(report.playlistMembers, 'unresolved');
      }
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
    const match = episodeMatch(clip.episodeId, episodes, podcastChannels, catalog);
    if (match === 'resolved') {
      tally(report.clips, 'resolved');
    } else if (match === 'missing') {
      tally(report.clips, 'keptWithoutItem');
    } else {
      tally(report.clips, 'unresolved');
    }
  }

  for (const row of snapshot.queue) {
    tally(
      report.queue,
      classifyPlayback(row, mediaRefs, episodes, podcastChannels, catalog)
    );
  }
  for (const row of snapshot.history) {
    tally(
      report.history,
      classifyPlayback(row, mediaRefs, episodes, podcastChannels, catalog)
    );
  }
  for (const row of snapshot.nowPlaying) {
    tally(
      report.nowPlaying,
      classifyPlayback(row, mediaRefs, episodes, podcastChannels, catalog)
    );
  }

  return report;
}
