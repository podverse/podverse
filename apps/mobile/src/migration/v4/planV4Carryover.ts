import type {
  DTOLegacyPodcastLookupAnswer,
  DTOLegacyPodcastLookupChannel,
} from '@podverse/helpers/dto';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';

import type { V4StagedEntry } from './parseV4LocalState';

/** A row the lookup could not settle stays as it is. The caller counts another attempt. */
export type V4CarryoverRowStatus = 'subscribed' | 'add_by_rss' | 'blocked' | 'waiting' | null;

export type V4CarryoverRowOutcome = {
  legacyId: string;
  legacyKind: V4StagedEntry['legacyKind'];
  status: V4CarryoverRowStatus;
};

export type V4CarryoverAction =
  | { channel: DTOLegacyPodcastLookupChannel; channelIdText: string; kind: 'subscribe' }
  | { feedUrl: string; kind: 'add_by_rss'; title: string | null };

export type V4CarryoverPlan = {
  actions: V4CarryoverAction[];
  rows: V4CarryoverRowOutcome[];
};

export type V4CarryoverApplyCounts = {
  addByRss: number;
  blocked: number;
  subscribed: number;
  waiting: number;
};

type FeedDecision = { feedUrl: string; status: 'add_by_rss'; title: string | null };
type RowDecision =
  | { channel: DTOLegacyPodcastLookupChannel; status: 'subscribed' }
  | FeedDecision
  | { status: 'blocked' }
  | { status: 'waiting' }
  | { status: null };

const trimmedTitle = (title: string | null): string | null => {
  if (title === null) {
    return null;
  }
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const feedDecision = (feedUrl: string, title: string | null): FeedDecision | { status: null } => {
  const canonical = canonicalAddByRSSFeedUrl(feedUrl);
  if (canonical === null) {
    return { status: null };
  }
  return { feedUrl: canonical, status: 'add_by_rss', title: trimmedTitle(title) };
};

const decidePodcast = (
  entry: V4StagedEntry,
  answer: DTOLegacyPodcastLookupAnswer | undefined
): RowDecision => {
  if (answer === undefined) {
    return { status: null };
  }
  if (answer.kind === 'blocked') {
    return { status: 'blocked' };
  }
  if (answer.kind === 'channel') {
    const channelIdText = answer.channel.id_text.trim();
    if (channelIdText.length === 0 || trimmedTitle(answer.channel.title) === null) {
      return { status: null };
    }
    return { channel: answer.channel, status: 'subscribed' };
  }
  if (answer.kind === 'feed_url') {
    return feedDecision(answer.feed_url, entry.cachedTitle);
  }
  if (answer.kind === 'not_here') {
    if (entry.cachedFeedUrl === null) {
      return { status: 'waiting' };
    }
    const cached = feedDecision(entry.cachedFeedUrl, entry.cachedTitle);
    return cached.status === null ? { status: 'waiting' } : cached;
  }
  return { status: null };
};

const decideEntry = (
  entry: V4StagedEntry,
  answers: ReadonlyMap<string, DTOLegacyPodcastLookupAnswer>
): RowDecision => {
  if (entry.legacyKind === 'add_by_rss') {
    return feedDecision(entry.legacyId, entry.cachedTitle);
  }
  return decidePodcast(entry, answers.get(entry.legacyId));
};

/**
 * One action per directory channel and per feed address. Rows keep their own outcome, so two
 * shows that land on the same channel are both subscribed and the channel is followed once.
 * A blocked id never becomes an Add by RSS feed, including when a cached address is stored.
 */
export const planV4Carryover = (
  entries: readonly V4StagedEntry[],
  answers: ReadonlyMap<string, DTOLegacyPodcastLookupAnswer>
): V4CarryoverPlan => {
  const actions: V4CarryoverAction[] = [];
  const rows: V4CarryoverRowOutcome[] = [];
  const subscribeIndexByChannel = new Map<string, number>();
  const addIndexByUrl = new Map<string, number>();

  for (const entry of entries) {
    const decision = decideEntry(entry, answers);
    rows.push({
      legacyId: entry.legacyId,
      legacyKind: entry.legacyKind,
      status: decision.status,
    });

    if (decision.status === 'subscribed') {
      const channelIdText = decision.channel.id_text.trim();
      if (!subscribeIndexByChannel.has(channelIdText)) {
        subscribeIndexByChannel.set(channelIdText, actions.length);
        actions.push({ channel: decision.channel, channelIdText, kind: 'subscribe' });
      }
      continue;
    }

    if (decision.status !== 'add_by_rss') {
      continue;
    }

    const existingIndex = addIndexByUrl.get(decision.feedUrl);
    if (existingIndex === undefined) {
      addIndexByUrl.set(decision.feedUrl, actions.length);
      actions.push({
        feedUrl: decision.feedUrl,
        kind: 'add_by_rss',
        title: decision.title,
      });
      continue;
    }

    const existing = actions[existingIndex];
    if (existing !== undefined && existing.kind === 'add_by_rss' && existing.title === null) {
      existing.title = decision.title;
    }
  }

  return { actions, rows };
};

export const countV4CarryoverRows = (
  rows: readonly V4CarryoverRowOutcome[]
): V4CarryoverApplyCounts => {
  const counts: V4CarryoverApplyCounts = {
    addByRss: 0,
    blocked: 0,
    subscribed: 0,
    waiting: 0,
  };
  for (const row of rows) {
    if (row.status === 'subscribed') {
      counts.subscribed += 1;
    } else if (row.status === 'add_by_rss') {
      counts.addByRss += 1;
    } else if (row.status === 'blocked') {
      counts.blocked += 1;
    } else if (row.status === 'waiting') {
      counts.waiting += 1;
    }
  }
  return counts;
};
