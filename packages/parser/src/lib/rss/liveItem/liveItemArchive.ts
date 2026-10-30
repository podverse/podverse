import { LiveItemStatusEnum } from '@podverse/helpers';

type ExistingLiveItemRef = {
  guid: string | null;
  itemId: number;
  statusId: number;
};

export type LiveItemsLeavingFeed = {
  /** Item ids to flag PendingArchive. */
  itemIdsToArchive: number[];
  /** Item ids whose live item status becomes Ended. */
  itemIdsToMarkEnded: number[];
};

/**
 * Existing live items that left the feed's live set in this parse.
 *
 * A guid skipped for an invalid status stays. An id the live pass updated stays. Every other row
 * left the live set: its status becomes Ended unless it already is, and it is archived unless the
 * regular item pass updated the same row in this parse.
 */
export const resolveLiveItemsLeavingFeed = (params: {
  existing: readonly ExistingLiveItemRef[];
  liveUpdatedItemIds: readonly number[];
  skippedGuids: ReadonlySet<string>;
  regularUpdatedItemIds: readonly number[];
}): LiveItemsLeavingFeed => {
  const itemIdsToArchive: number[] = [];
  const itemIdsToMarkEnded: number[] = [];

  for (const row of params.existing) {
    if (row.guid !== null && params.skippedGuids.has(row.guid)) {
      continue;
    }
    if (params.liveUpdatedItemIds.includes(row.itemId)) {
      continue;
    }
    if (row.statusId !== LiveItemStatusEnum.Ended) {
      itemIdsToMarkEnded.push(row.itemId);
    }
    if (!params.regularUpdatedItemIds.includes(row.itemId)) {
      itemIdsToArchive.push(row.itemId);
    }
  }

  return { itemIdsToArchive, itemIdsToMarkEnded };
};
