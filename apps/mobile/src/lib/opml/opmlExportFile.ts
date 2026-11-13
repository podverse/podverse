import { generateOpml } from '@podverse/helpers/opml/generate';

export type DeviceOpmlFeed = { feedUrl: string; title: string | null };

export const opmlExportFilename = (now: Date): string =>
  `podverse-opml-export-${now.toISOString().split('T')[0]}.opml`;

/**
 * The OPML a signed-out device exports: directory follows first, then Add by RSS feeds, the
 * order the account export uses. Null when there is nothing to write.
 */
export const buildDeviceOpmlExport = (params: {
  addByRssFeeds: readonly DeviceOpmlFeed[];
  directoryFeeds: readonly DeviceOpmlFeed[];
}): string | null => {
  if (params.addByRssFeeds.length === 0 && params.directoryFeeds.length === 0) {
    return null;
  }
  return generateOpml({
    addByRssChannels: [...params.addByRssFeeds],
    directoryChannels: [...params.directoryFeeds],
  });
};
