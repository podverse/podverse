/**
 * Which completed downloads belong on Home under "Downloaded only".
 *
 * A download may not have stored a channel id — episode list payloads often omit the nested
 * `channel` — so callers pass a fallback map from `channel_item`. The grouping itself stays
 * free of SQLite so the join-or-column rule is unit-testable.
 */

export type UnsubscribedDownloadSourceRow = {
  itemIdText: string;
  channelIdText: string | null;
  channelTitle: string | null;
  artworkUrl: string | null;
};

export type ItemChannelHint = {
  channelIdText: string;
  imageUrl: string | null;
};

export type UnsubscribedDownloadChannel = {
  channelIdText: string;
  title: string;
  imageUrl: string | null;
  downloadedCount: number;
};

const isHumanTitle = (title: string, channelIdText: string): boolean => {
  return title.length > 0 && title !== channelIdText;
};

export const groupUnsubscribedDownloadChannels = (
  rows: readonly UnsubscribedDownloadSourceRow[],
  subscribedIdTexts: ReadonlySet<string>,
  itemChannelByItemId: ReadonlyMap<string, ItemChannelHint>
): UnsubscribedDownloadChannel[] => {
  const byChannel = new Map<
    string,
    { title: string; imageUrl: string | null; count: number }
  >();

  for (const row of rows) {
    const hint = itemChannelByItemId.get(row.itemIdText);
    const channelId =
      row.channelIdText !== null && row.channelIdText.length > 0
        ? row.channelIdText
        : (hint?.channelIdText ?? null);
    if (channelId === null || channelId === '' || subscribedIdTexts.has(channelId)) {
      continue;
    }

    const candidateTitle = row.channelTitle;
    const candidateImage = row.artworkUrl ?? hint?.imageUrl ?? null;
    const existing = byChannel.get(channelId);
    if (existing === undefined) {
      byChannel.set(channelId, {
        count: 1,
        imageUrl: candidateImage,
        title:
          candidateTitle !== null && isHumanTitle(candidateTitle, channelId)
            ? candidateTitle
            : channelId,
      });
      continue;
    }

    existing.count += 1;
    if (
      !isHumanTitle(existing.title, channelId) &&
      candidateTitle !== null &&
      isHumanTitle(candidateTitle, channelId)
    ) {
      existing.title = candidateTitle;
    }
    if (existing.imageUrl === null && candidateImage !== null) {
      existing.imageUrl = candidateImage;
    }
  }

  return [...byChannel.entries()]
    .map(([channelIdText, value]) => ({
      channelIdText,
      downloadedCount: value.count,
      imageUrl: value.imageUrl,
      title: value.title,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};
