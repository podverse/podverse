export type HomeFeedRowDownloadBinding<TItem> = {
  item: TItem;
  testID: string;
};

/**
 * Row download control mounts when an item is supplied. The testID is passed through unchanged so
 * Maestro selectors match the string the row was given.
 */
export function resolveHomeFeedRowDownload<TItem>(
  downloadItem: TItem | undefined,
  downloadTestID: string | undefined
): HomeFeedRowDownloadBinding<TItem> | undefined {
  if (downloadItem === undefined) {
    return undefined;
  }
  return { item: downloadItem, testID: downloadTestID ?? '' };
}
