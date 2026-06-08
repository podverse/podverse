import type { EmbedListRow } from './embedListTypes';
import type { EmbedMediaType } from './embedTypes';

type EmbedListMediaRow = Pick<EmbedListRow, 'mediaType'>;

export function listHasMixedEmbedMedia(rows: EmbedListMediaRow[]): boolean {
  let hasAudio = false;
  let hasVideo = false;

  for (const row of rows) {
    if (row.mediaType === 'audio') {
      hasAudio = true;
    }

    if (row.mediaType === 'video') {
      hasVideo = true;
    }

    if (hasAudio && hasVideo) {
      return true;
    }
  }

  return false;
}

export function resolveInitialPresentationStyle(
  row: Pick<EmbedListRow, 'mediaType'> | null
): EmbedMediaType {
  if (row === null) {
    return 'audio';
  }

  return row.mediaType === 'video' ? 'video' : 'audio';
}
