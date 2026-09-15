export type PlaybackHandoffLocalState = {
  itemIdText: string;
  itemTitle: string | null;
  lastPlayedAt: string | null;
};

let playbackHandoffLocalState: PlaybackHandoffLocalState | null = null;

const normalize = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const readPlaybackHandoffLocalState = (): PlaybackHandoffLocalState | null =>
  playbackHandoffLocalState;

export const clearPlaybackHandoffLocalState = (): void => {
  playbackHandoffLocalState = null;
};

export const writePlaybackHandoffLocalState = ({
  itemIdText,
  itemTitle,
  lastPlayedAt,
}: {
  itemIdText: string | null | undefined;
  itemTitle: string | null | undefined;
  lastPlayedAt: string | null | undefined;
}): void => {
  const resolvedItemIdText = normalize(itemIdText);
  if (resolvedItemIdText === null) {
    return;
  }

  playbackHandoffLocalState = {
    itemIdText: resolvedItemIdText,
    itemTitle: normalize(itemTitle),
    lastPlayedAt: normalize(lastPlayedAt),
  };
};
