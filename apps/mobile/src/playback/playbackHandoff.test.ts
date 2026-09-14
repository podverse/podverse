import { describe, expect, it } from 'vitest';

import type { PlaybackReconcileDifferentNowPlayingConflict } from '../data/repositories/playbackReconcile';
import {
  buildPlaybackHandoffDismissedStateKey,
  shouldPromptForPlaybackHandoffConflict,
} from './playbackHandoff';

const state = (
  resourceIdText: string,
  lastMeaningfulAt: number
): PlaybackReconcileDifferentNowPlayingConflict['local'] => ({
  queueIdText: 'queue-av',
  resourceIdText,
  resourceKind: 'item',
  playbackPosition: 120,
  mediaFileDuration: null,
  completed: false,
  zone: 'now_playing',
  lastMeaningfulAt,
});

const conflict = ({
  local,
  remote,
}: {
  local: PlaybackReconcileDifferentNowPlayingConflict['local'];
  remote: PlaybackReconcileDifferentNowPlayingConflict['remote'];
}): PlaybackReconcileDifferentNowPlayingConflict => ({
  queueIdText: 'queue-av',
  local,
  remote,
  winner: remote,
  loser: local,
  shouldPrompt: true,
});

describe('playbackHandoff', () => {
  it('builds a dismissal key from remote state id and timestamp', () => {
    expect(buildPlaybackHandoffDismissedStateKey(state('episode-server', 1234))).toBe(
      'episode-server::1234'
    );
  });

  it('suppresses prompts for the same declined remote state', () => {
    const local = state('episode-local', 1000);
    const remote = state('episode-server', 2000);
    const dismissedStateKey = buildPlaybackHandoffDismissedStateKey(remote);

    expect(
      shouldPromptForPlaybackHandoffConflict({
        conflict: conflict({ local, remote }),
        dismissedStateKey,
        isPlayingLocally: false,
      })
    ).toBe(false);
  });

  it('shows the prompt again when the declined remote timestamp changes', () => {
    const local = state('episode-local', 1000);
    const declinedRemote = state('episode-server', 2000);
    const nextRemote = state('episode-server', 3000);
    const dismissedStateKey = buildPlaybackHandoffDismissedStateKey(declinedRemote);

    expect(
      shouldPromptForPlaybackHandoffConflict({
        conflict: conflict({ local, remote: nextRemote }),
        dismissedStateKey,
        isPlayingLocally: false,
      })
    ).toBe(true);
  });

  it('never prompts while playback is active locally', () => {
    const local = state('episode-local', 1000);
    const remote = state('episode-server', 2000);

    expect(
      shouldPromptForPlaybackHandoffConflict({
        conflict: conflict({ local, remote }),
        dismissedStateKey: null,
        isPlayingLocally: true,
      })
    ).toBe(false);
  });
});
