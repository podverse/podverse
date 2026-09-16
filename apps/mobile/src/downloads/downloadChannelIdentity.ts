/**
 * Channel identity stamped onto a download row so the Downloads list can name the show without
 * reopening the episode payload. List items often omit `item.channel` or send an id with no title;
 * callers merge every source they have and keep the first usable id and title.
 */

export type DownloadChannelIdentity = {
  channelIdText: string | null;
  channelTitle: string | null;
};

export const usableDownloadChannelText = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const mergeDownloadChannelIdentity = (
  parts: readonly Partial<DownloadChannelIdentity>[]
): DownloadChannelIdentity => {
  let channelIdText: string | null = null;
  let channelTitle: string | null = null;

  for (const part of parts) {
    if (channelIdText === null) {
      channelIdText = usableDownloadChannelText(part.channelIdText);
    }
    if (channelTitle === null) {
      channelTitle = usableDownloadChannelText(part.channelTitle);
    }
    if (channelIdText !== null && channelTitle !== null) {
      break;
    }
  }

  return { channelIdText, channelTitle };
};
