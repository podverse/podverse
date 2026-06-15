import { describe, expect, it, vi } from 'vitest';

import { applyItemEnclosureSurfaceChangeFromRef } from '../mediaElementBridgeSurface';

describe('applyItemEnclosureSurfaceChangeFromRef', () => {
  it('does not rewind currentTime when reloading the active enclosure surface', () => {
    const media = {
      currentTime: 83,
      load: vi.fn(),
      pause: vi.fn(),
      removeAttribute: vi.fn(),
    } as unknown as HTMLMediaElement;

    applyItemEnclosureSurfaceChangeFromRef({ current: media }, {
      treatAsActiveNonLiveFile: true,
      shouldPlayWhenReady: false,
      onPlayedShouldPlayClear: () => undefined,
    });

    expect(media.currentTime).toBe(83);
    expect(media.load).toHaveBeenCalledTimes(1);
  });
});
