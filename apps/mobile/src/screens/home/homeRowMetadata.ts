import type { ChannelUnseenBadge } from '@podverse/helpers';
import { describeUnseenBadge } from '@podverse/helpers';

/**
 * What a Home subscription row says about itself beneath its title, assembled from the four local
 * stores that each hold one piece of it.
 *
 * Pure and free of `expo-sqlite`, so the joining rules are unit-testable in node. The repositories
 * read; this decides what the reads add up to.
 *
 * Every source is a whole-list read indexed once here rather than a lookup per row, because a
 * subscription list can be hundreds long and four per-row queries each would make scrolling it a
 * database exercise.
 */

export type HomeRowMetadata = {
  /**
   * Finished downloads for this subscription. Zero means the row shows nothing, so the line only
   * appears when there is something to open with no connection.
   */
  downloadedCount: number;
  isLive: boolean;
  /** When this subscription last published, or null when nothing is stored for it yet. */
  latestItemPubDateMs: number | null;
  /** Null when there is nothing new, so a row with no badge needs no further check. */
  unseenBadge: ChannelUnseenBadge | null;
};

/** The shape `channelSeenRepository.listUnseen` returns, restated so this module imports no store. */
export type HomeRowUnseenInput = {
  hasMoreUnseen: boolean;
  subscriptionKey: string;
  unseenCount: number;
};

export type HomeRowSubscriptionInput = {
  idText: string;
  latestItemPubDateMs: number | null;
};

export type HomeRowMetadataSources = {
  /** Subscription keys currently broadcasting, already filtered for staleness by the store. */
  broadcastingKeys: ReadonlySet<string>;
  /**
   * Finished downloads per channel `id_text`. Add-by-RSS feeds are absent because their episodes
   * have no download path yet, which reads as a count of zero and therefore no line.
   */
  downloadedCountByChannel: ReadonlyMap<string, number>;
  unseen: readonly HomeRowUnseenInput[];
};

/**
 * Index the four stores against the subscription list, keyed by the same `idText` the rows use.
 *
 * A subscription missing from a source is not an error — it is a channel the item sync has not
 * reached, a feed with nothing downloaded, or a show that is not on the air. Each of those reads as
 * the quiet default rather than as a gap to report.
 */
export const buildHomeRowMetadata = (
  subscriptions: readonly HomeRowSubscriptionInput[],
  sources: HomeRowMetadataSources
): Map<string, HomeRowMetadata> => {
  const unseenByKey = new Map(sources.unseen.map((entry) => [entry.subscriptionKey, entry]));
  const metadata = new Map<string, HomeRowMetadata>();

  for (const subscription of subscriptions) {
    const unseen = unseenByKey.get(subscription.idText);

    metadata.set(subscription.idText, {
      downloadedCount: sources.downloadedCountByChannel.get(subscription.idText) ?? 0,
      isLive: sources.broadcastingKeys.has(subscription.idText),
      latestItemPubDateMs: subscription.latestItemPubDateMs,
      unseenBadge:
        unseen === undefined
          ? null
          : describeUnseenBadge({
              has_more_unseen: unseen.hasMoreUnseen,
              unseen_count: unseen.unseenCount,
            }),
    });
  }

  return metadata;
};
