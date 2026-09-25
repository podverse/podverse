import type { NowPlayingSegmentKind } from '../../playback/nowPlayingSegment';

/**
 * Leading glyph for a now-playing segment. Chapters are title-only — the bookmark is not shown.
 */
export const nowPlayingSegmentLeadingIcon = (
  kind: NowPlayingSegmentKind
): 'cut-outline' | 'mic-outline' | null => {
  switch (kind) {
    case 'chapter':
      return null;
    case 'clip':
      return 'cut-outline';
    case 'official-clip':
      return 'mic-outline';
  }
};
