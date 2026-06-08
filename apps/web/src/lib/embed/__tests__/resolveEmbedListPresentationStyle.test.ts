import { describe, expect, it } from 'vitest';

import type { EmbedMediaType } from '../embedTypes';
import {
  listHasMixedEmbedMedia,
  resolveInitialPresentationStyle,
} from '../resolveEmbedListPresentationStyle';

function buildRow(mediaType: EmbedMediaType, rowKey: string) {
  return { rowKey, mediaType };
}

describe('resolveEmbedListPresentationStyle', () => {
  it('detects mixed media when rows include audio and video', () => {
    expect(listHasMixedEmbedMedia([buildRow('audio', 'a'), buildRow('video', 'b')])).toBe(true);
    expect(listHasMixedEmbedMedia([buildRow('audio', 'a'), buildRow('audio', 'b')])).toBe(false);
  });

  it('defaults presentation style from the selected row media type', () => {
    expect(resolveInitialPresentationStyle(buildRow('audio', 'a'))).toBe('audio');
    expect(resolveInitialPresentationStyle(buildRow('video', 'b'))).toBe('video');
    expect(resolveInitialPresentationStyle(null)).toBe('audio');
  });
});
