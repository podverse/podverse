import { describe, expect, it } from 'vitest';

import { LiveItemStatusEnum } from '@podverse/helpers';

import { resolveLiveItemsLeavingFeed } from './liveItemArchive.js';

const existingRow = (
  guid: string | null,
  itemId: number,
  statusId: LiveItemStatusEnum = LiveItemStatusEnum.Live
) => ({
  guid,
  itemId,
  statusId,
});

describe('resolveLiveItemsLeavingFeed', () => {
  it('archives and ends a live item that this parse did not update and did not skip', () => {
    expect(
      resolveLiveItemsLeavingFeed({
        existing: [existingRow('gone', 3)],
        liveUpdatedItemIds: [],
        skippedGuids: new Set<string>(),
        regularUpdatedItemIds: [],
      })
    ).toEqual({ itemIdsToArchive: [3], itemIdsToMarkEnded: [3] });
  });

  it('keeps a live item whose guid was skipped for an invalid status', () => {
    expect(
      resolveLiveItemsLeavingFeed({
        existing: [existingRow('bad-status', 1)],
        liveUpdatedItemIds: [],
        skippedGuids: new Set(['bad-status']),
        regularUpdatedItemIds: [],
      })
    ).toEqual({ itemIdsToArchive: [], itemIdsToMarkEnded: [] });
  });

  it('keeps a live item this parse updated', () => {
    expect(
      resolveLiveItemsLeavingFeed({
        existing: [existingRow('updated', 2)],
        liveUpdatedItemIds: [2],
        skippedGuids: new Set<string>(),
        regularUpdatedItemIds: [],
      })
    ).toEqual({ itemIdsToArchive: [], itemIdsToMarkEnded: [] });
  });

  it('archives and ends a skipped row that has no guid', () => {
    expect(
      resolveLiveItemsLeavingFeed({
        existing: [existingRow(null, 4)],
        liveUpdatedItemIds: [],
        skippedGuids: new Set(['bad-status']),
        regularUpdatedItemIds: [],
      })
    ).toEqual({ itemIdsToArchive: [4], itemIdsToMarkEnded: [4] });
  });

  it('ends and archives a departed pending live item', () => {
    expect(
      resolveLiveItemsLeavingFeed({
        existing: [existingRow('scheduled', 5, LiveItemStatusEnum.Pending)],
        liveUpdatedItemIds: [],
        skippedGuids: new Set<string>(),
        regularUpdatedItemIds: [],
      })
    ).toEqual({ itemIdsToArchive: [5], itemIdsToMarkEnded: [5] });
  });

  it('archives a departed live item that is already ended without marking it ended again', () => {
    expect(
      resolveLiveItemsLeavingFeed({
        existing: [existingRow('finished', 6, LiveItemStatusEnum.Ended)],
        liveUpdatedItemIds: [],
        skippedGuids: new Set<string>(),
        regularUpdatedItemIds: [],
      })
    ).toEqual({ itemIdsToArchive: [6], itemIdsToMarkEnded: [] });
  });

  it('marks a departed live item ended without archiving it when the regular item pass updated that row', () => {
    expect(
      resolveLiveItemsLeavingFeed({
        existing: [existingRow('republished', 7)],
        liveUpdatedItemIds: [],
        skippedGuids: new Set<string>(),
        regularUpdatedItemIds: [7],
      })
    ).toEqual({ itemIdsToArchive: [], itemIdsToMarkEnded: [7] });
  });

  it('keeps departed rows in input order', () => {
    expect(
      resolveLiveItemsLeavingFeed({
        existing: [existingRow('finished', 6, LiveItemStatusEnum.Ended), existingRow('gone', 3)],
        liveUpdatedItemIds: [],
        skippedGuids: new Set<string>(),
        regularUpdatedItemIds: [],
      })
    ).toEqual({ itemIdsToArchive: [6, 3], itemIdsToMarkEnded: [3] });
  });

  it('keeps a live item the live pass updated when the regular item pass updated the same row', () => {
    expect(
      resolveLiveItemsLeavingFeed({
        existing: [existingRow('still-live', 8)],
        liveUpdatedItemIds: [8],
        skippedGuids: new Set<string>(),
        regularUpdatedItemIds: [8],
      })
    ).toEqual({ itemIdsToArchive: [], itemIdsToMarkEnded: [] });
  });
});
