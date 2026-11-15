import type { DeviceOpmlFeed } from '../../lib/opml/opmlExportFile';
import type { V4StagedEntry } from './parseV4LocalState';

export type CarryoverOutlines = {
  addByRssFeeds: DeviceOpmlFeed[];
  directoryFeeds: DeviceOpmlFeed[];
  skipped: number;
};

const nonEmpty = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * OPML outlines from staged rows.
 *
 * A directory row needs a title and a cached feed address. An Add by RSS row needs a title;
 * its id is the address. A row missing either is counted in `skipped` and left out of the file.
 */
export const buildCarryoverOutlines = (rows: readonly V4StagedEntry[]): CarryoverOutlines => {
  const directoryFeeds: DeviceOpmlFeed[] = [];
  const addByRssFeeds: DeviceOpmlFeed[] = [];
  let skipped = 0;

  for (const row of rows) {
    const title = nonEmpty(row.cachedTitle);
    if (row.legacyKind === 'podcast') {
      const feedUrl = nonEmpty(row.cachedFeedUrl);
      if (title === null || feedUrl === null) {
        skipped += 1;
        continue;
      }
      directoryFeeds.push({ feedUrl, title });
      continue;
    }

    const feedUrl = nonEmpty(row.legacyId);
    if (title === null || feedUrl === null) {
      skipped += 1;
      continue;
    }
    addByRssFeeds.push({ feedUrl, title });
  }

  return { addByRssFeeds, directoryFeeds, skipped };
};

export const carryoverOutlineCount = (outlines: CarryoverOutlines): number =>
  outlines.addByRssFeeds.length + outlines.directoryFeeds.length;
