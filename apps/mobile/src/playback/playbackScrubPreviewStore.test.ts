import { describe, expect, it } from 'vitest';

import {
  getPlaybackScrubPreviewSeconds,
  setPlaybackScrubPreviewSeconds,
  subscribePlaybackScrubPreview,
} from './playbackScrubPreviewStore';

describe('playbackScrubPreviewStore', () => {
  it('stores a whole-second preview and clears it', () => {
    setPlaybackScrubPreviewSeconds(null);
    expect(getPlaybackScrubPreviewSeconds()).toBeNull();
    setPlaybackScrubPreviewSeconds(45.8);
    expect(getPlaybackScrubPreviewSeconds()).toBe(45);
    setPlaybackScrubPreviewSeconds(null);
    expect(getPlaybackScrubPreviewSeconds()).toBeNull();
  });

  it('notifies subscribers only when the second changes', () => {
    setPlaybackScrubPreviewSeconds(null);
    let ticks = 0;
    const unsubscribe = subscribePlaybackScrubPreview(() => {
      ticks += 1;
    });
    setPlaybackScrubPreviewSeconds(12.2);
    setPlaybackScrubPreviewSeconds(12.9);
    expect(ticks).toBe(1);
    setPlaybackScrubPreviewSeconds(13);
    expect(ticks).toBe(2);
    unsubscribe();
    setPlaybackScrubPreviewSeconds(null);
  });
});
