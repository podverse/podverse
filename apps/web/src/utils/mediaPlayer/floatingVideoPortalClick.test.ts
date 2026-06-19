import { describe, expect, it } from 'vitest';

import { shouldFloatingVideoPortalClickTogglePlay } from './floatingVideoPortalClick';

describe('shouldFloatingVideoPortalClickTogglePlay', () => {
  it('returns true for clicks on the video surface', () => {
    const portal = document.createElement('div');
    const video = document.createElement('video');
    portal.appendChild(video);
    document.body.appendChild(portal);

    expect(shouldFloatingVideoPortalClickTogglePlay(video)).toBe(true);

    portal.remove();
  });

  it('returns false for chrome controls marked with data-floating-video-chrome', () => {
    const portal = document.createElement('div');
    const closeButton = document.createElement('button');
    closeButton.setAttribute('data-floating-video-chrome', '');
    portal.appendChild(closeButton);
    document.body.appendChild(portal);

    expect(shouldFloatingVideoPortalClickTogglePlay(closeButton)).toBe(false);

    portal.remove();
  });

  it('returns false for native button elements', () => {
    const button = document.createElement('button');
    expect(shouldFloatingVideoPortalClickTogglePlay(button)).toBe(false);
  });
});
