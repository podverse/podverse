import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { canAttemptAnonymousPlaybackRestore } from '../../../utils/anonymousPlaybackRestoreEligibility';
import { updateLayoutForMediaPlayer } from '../../../utils/mediaPlayer/mediaPlayerLayout';

describe('updateLayoutForMediaPlayer embed guardrails', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="sidebar"></div>
      <div id="page-wrapper"></div>
      <aside id="media-player"></aside>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds media-player-active when skipMainAppLayoutMutations is false', () => {
    updateLayoutForMediaPlayer({ id: 'playing' }, { skipMainAppLayoutMutations: false });

    expect(document.getElementById('sidebar')?.classList.contains('media-player-active')).toBe(
      true
    );
    expect(document.getElementById('page-wrapper')?.classList.contains('media-player-active')).toBe(
      true
    );
    expect(document.getElementById('media-player')?.classList.contains('media-player-active')).toBe(
      true
    );
  });

  it('does not mutate layout when skipMainAppLayoutMutations is true', () => {
    updateLayoutForMediaPlayer({ id: 'playing' }, { skipMainAppLayoutMutations: true });

    expect(document.getElementById('sidebar')?.classList.contains('media-player-active')).toBe(
      false
    );
    expect(document.getElementById('page-wrapper')?.classList.contains('media-player-active')).toBe(
      false
    );
    expect(document.getElementById('media-player')?.classList.contains('media-player-active')).toBe(
      false
    );
  });
});

describe('canAttemptAnonymousPlaybackRestore embed guardrails', () => {
  it('returns false when skipAnonymousPlaybackRestore is true', () => {
    expect(
      canAttemptAnonymousPlaybackRestore({
        skipAnonymousPlaybackRestore: true,
        loggedInAccount: null,
        restoreAlreadyStarted: false,
        allowsAnonymousFeatureStorage: true,
      })
    ).toBe(false);
  });

  it('returns true for anonymous guest when embed guardrails are off', () => {
    expect(
      canAttemptAnonymousPlaybackRestore({
        skipAnonymousPlaybackRestore: false,
        loggedInAccount: null,
        restoreAlreadyStarted: false,
        allowsAnonymousFeatureStorage: true,
      })
    ).toBe(true);
  });
});
