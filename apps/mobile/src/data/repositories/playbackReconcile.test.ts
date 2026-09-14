import { describe, expect, it } from 'vitest';

import type { PlaybackEventKind } from '@podverse/helpers/playbackEvents';

import type { PlaybackOutboxResourceKind } from './playbackOutbox';
import type {
  PlaybackReconcileOutboxEvent,
  PlaybackReconcilePlannerInput,
  PlaybackReconcileResourceState,
} from './playbackReconcile';
import { findNowPlayingInvariantViolations, planPlaybackReconcile } from './playbackReconcile';

const at = (iso: string): number => Date.parse(iso);

const state = (
  resourceIdText: string,
  overrides: Partial<PlaybackReconcileResourceState> = {}
): PlaybackReconcileResourceState => ({
  queueIdText: 'queue-main',
  resourceKind: 'item',
  resourceIdText,
  playbackPosition: 0,
  mediaFileDuration: null,
  completed: false,
  zone: 'history',
  lastMeaningfulAt: at('2026-09-13T00:00:00.000Z'),
  ...overrides,
});

const event = (
  resourceIdText: string,
  eventKind: PlaybackEventKind,
  occurredAtIso: string,
  overrides: Partial<PlaybackReconcileOutboxEvent> = {}
): PlaybackReconcileOutboxEvent => ({
  queueIdText: 'queue-main',
  resourceKind: 'item',
  resourceIdText,
  eventKind,
  occurredAt: at(occurredAtIso),
  ...overrides,
});

const findResolved = (
  resolved: readonly PlaybackReconcileResourceState[],
  params: {
    queueIdText?: string;
    resourceKind?: PlaybackOutboxResourceKind;
    resourceIdText: string;
  }
): PlaybackReconcileResourceState | undefined => {
  const queueIdText = params.queueIdText ?? 'queue-main';
  const resourceKind = params.resourceKind ?? 'item';
  return resolved.find((entry) => {
    return (
      entry.queueIdText === queueIdText &&
      entry.resourceKind === resourceKind &&
      entry.resourceIdText === params.resourceIdText
    );
  });
};

const findNowPlayingByQueue = (
  resolved: readonly PlaybackReconcileResourceState[],
  queueIdText = 'queue-main'
): PlaybackReconcileResourceState | undefined => {
  return resolved.find(
    (entry) => entry.queueIdText === queueIdText && entry.zone === 'now_playing'
  );
};

const run = (
  input: Partial<PlaybackReconcilePlannerInput>
): ReturnType<typeof planPlaybackReconcile> => {
  return planPlaybackReconcile({
    localOutboxEvents: input.localOutboxEvents ?? [],
    localState: input.localState ?? [],
    remoteState: input.remoteState ?? [],
    isPlayingLocally: input.isPlayingLocally ?? false,
  });
};

describe('planPlaybackReconcile table cases', () => {
  const cases: {
    name: string;
    input: Partial<PlaybackReconcilePlannerInput>;
    assert: (plan: ReturnType<typeof planPlaybackReconcile>) => void;
  }[] = [
    {
      name: 'keeps 06:00 offline A behind 07:00 remote B; hydration at 08:00 does nothing',
      input: {
        localState: [
          state('episode-a', {
            zone: 'now_playing',
            playbackPosition: 120,
            lastMeaningfulAt: at('2026-09-13T06:00:00.000Z'),
          }),
        ],
        remoteState: [
          state('episode-b', {
            zone: 'now_playing',
            playbackPosition: 240,
            lastMeaningfulAt: at('2026-09-13T07:00:00.000Z'),
          }),
        ],
      },
      assert: (plan) => {
        expect(findNowPlayingByQueue(plan.resolved)?.resourceIdText).toBe('episode-b');
        expect(findResolved(plan.resolved, { resourceIdText: 'episode-a' })?.zone).toBe('history');
        expect(findResolved(plan.resolved, { resourceIdText: 'episode-a' })?.playbackPosition).toBe(
          120
        );
      },
    },
    {
      name: 'three-way interleave produces B, C, A ordering across non-upcoming rows',
      input: {
        localState: [
          state('episode-a', {
            zone: 'history',
            playbackPosition: 111,
            lastMeaningfulAt: at('2026-09-13T09:20:00.000Z'),
          }),
          state('episode-b', {
            zone: 'now_playing',
            playbackPosition: 333,
            lastMeaningfulAt: at('2026-09-13T09:55:00.000Z'),
          }),
        ],
        remoteState: [
          state('episode-c', {
            zone: 'now_playing',
            playbackPosition: 222,
            lastMeaningfulAt: at('2026-09-13T09:30:00.000Z'),
          }),
        ],
      },
      assert: (plan) => {
        const ordered = [...plan.resolved]
          .filter((entry) => entry.queueIdText === 'queue-main' && entry.zone !== 'upcoming')
          .sort((left, right) => {
            const leftAt = left.lastMeaningfulAt ?? 0;
            const rightAt = right.lastMeaningfulAt ?? 0;
            return rightAt - leftAt;
          })
          .map((entry) => entry.resourceIdText);
        expect(ordered).toEqual(['episode-b', 'episode-c', 'episode-a']);
      },
    },
    {
      name: 'keeps playback position forward even when older side loses by timestamp',
      input: {
        localState: [
          state('episode-a', {
            zone: 'now_playing',
            playbackPosition: 42,
            lastMeaningfulAt: at('2026-09-13T10:05:00.000Z'),
          }),
        ],
        remoteState: [
          state('episode-a', {
            zone: 'history',
            playbackPosition: 180,
            lastMeaningfulAt: at('2026-09-13T10:00:00.000Z'),
          }),
        ],
      },
      assert: (plan) => {
        const merged = findResolved(plan.resolved, { resourceIdText: 'episode-a' });
        expect(merged?.zone).toBe('now_playing');
        expect(merged?.playbackPosition).toBe(180);
      },
    },
    {
      name: 'keeps completion sticky against a later incomplete event',
      input: {
        localState: [
          state('episode-a', {
            zone: 'now_playing',
            completed: false,
            playbackPosition: 70,
            lastMeaningfulAt: at('2026-09-13T10:10:00.000Z'),
          }),
        ],
        remoteState: [
          state('episode-a', {
            zone: 'history',
            completed: true,
            playbackPosition: 65,
            lastMeaningfulAt: at('2026-09-13T10:00:00.000Z'),
          }),
        ],
      },
      assert: (plan) => {
        expect(findResolved(plan.resolved, { resourceIdText: 'episode-a' })?.completed).toBe(true);
      },
    },
    {
      name: 'treats missing local upcoming as unknown, not as a remove signal',
      input: {
        localState: [],
        remoteState: [
          state('episode-a', {
            zone: 'upcoming',
            playbackPosition: 0,
            lastMeaningfulAt: at('2026-09-13T10:00:00.000Z'),
          }),
        ],
      },
      assert: (plan) => {
        expect(findResolved(plan.resolved, { resourceIdText: 'episode-a' })?.zone).toBe('upcoming');
        expect(plan.push).toHaveLength(0);
      },
    },
    {
      name: 'lets an older local tombstone lose to a newer remote play event',
      input: {
        localState: [
          state('episode-a', {
            zone: 'upcoming',
            lastMeaningfulAt: at('2026-09-13T09:50:00.000Z'),
          }),
        ],
        localOutboxEvents: [event('episode-a', 'queue_remove', '2026-09-13T10:00:00.000Z')],
        remoteState: [
          state('episode-a', {
            zone: 'now_playing',
            playbackPosition: 300,
            lastMeaningfulAt: at('2026-09-13T10:05:00.000Z'),
          }),
        ],
      },
      assert: (plan) => {
        const merged = findResolved(plan.resolved, { resourceIdText: 'episode-a' });
        expect(merged?.zone).toBe('now_playing');
        expect(merged?.playbackPosition).toBe(300);
      },
    },
    {
      name: 'same-item now-playing disagreement adopts newer position without conflict',
      input: {
        localState: [
          state('episode-a', {
            zone: 'now_playing',
            playbackPosition: 20,
            lastMeaningfulAt: at('2026-09-13T10:00:00.000Z'),
          }),
        ],
        remoteState: [
          state('episode-a', {
            zone: 'now_playing',
            playbackPosition: 45,
            lastMeaningfulAt: at('2026-09-13T10:05:00.000Z'),
          }),
        ],
      },
      assert: (plan) => {
        expect(plan.resolveConflicts).toEqual([]);
        expect(findResolved(plan.resolved, { resourceIdText: 'episode-a' })?.playbackPosition).toBe(
          45
        );
      },
    },
    {
      name: 'different-item now-playing disagreement returns conflict with loser in history',
      input: {
        localState: [
          state('episode-a', {
            zone: 'now_playing',
            playbackPosition: 80,
            lastMeaningfulAt: at('2026-09-13T10:00:00.000Z'),
          }),
        ],
        remoteState: [
          state('episode-b', {
            zone: 'now_playing',
            playbackPosition: 120,
            lastMeaningfulAt: at('2026-09-13T10:05:00.000Z'),
          }),
        ],
      },
      assert: (plan) => {
        expect(plan.resolveConflicts).toHaveLength(1);
        const conflict = plan.resolveConflicts[0];
        expect(conflict?.winner.resourceIdText).toBe('episode-b');
        expect(conflict?.loser.resourceIdText).toBe('episode-a');
        expect(conflict?.loser.zone).toBe('history');
      },
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, () => {
      const plan = run(testCase.input);
      testCase.assert(plan);
    });
  }
});

describe('planPlaybackReconcile invariants', () => {
  it('is idempotent once both sides match the resolved set', () => {
    const first = run({
      localState: [
        state('episode-a', {
          zone: 'now_playing',
          playbackPosition: 120,
          lastMeaningfulAt: at('2026-09-13T06:00:00.000Z'),
        }),
      ],
      remoteState: [
        state('episode-b', {
          zone: 'now_playing',
          playbackPosition: 240,
          lastMeaningfulAt: at('2026-09-13T07:00:00.000Z'),
        }),
      ],
    });

    const second = run({
      localState: first.resolved,
      remoteState: first.resolved,
    });

    expect(second.adopt).toEqual([]);
    expect(second.push).toEqual([]);
    expect(second.resolveConflicts).toEqual([]);
  });

  it('suppresses prompting while local playback is active', () => {
    const plan = run({
      isPlayingLocally: true,
      localState: [
        state('episode-a', {
          zone: 'now_playing',
          playbackPosition: 15,
          lastMeaningfulAt: at('2026-09-13T10:00:00.000Z'),
        }),
      ],
      remoteState: [
        state('episode-b', {
          zone: 'now_playing',
          playbackPosition: 45,
          lastMeaningfulAt: at('2026-09-13T10:05:00.000Z'),
        }),
      ],
    });

    expect(plan.resolveConflicts[0]?.shouldPrompt).toBe(false);
  });

  it('keeps the now-playing timestamp as the max timestamp among non-upcoming rows', () => {
    const plan = run({
      localState: [
        state('episode-a', {
          zone: 'history',
          playbackPosition: 111,
          lastMeaningfulAt: at('2026-09-13T09:20:00.000Z'),
        }),
        state('episode-b', {
          zone: 'now_playing',
          playbackPosition: 333,
          lastMeaningfulAt: at('2026-09-13T09:55:00.000Z'),
        }),
      ],
      remoteState: [
        state('episode-c', {
          zone: 'now_playing',
          playbackPosition: 222,
          lastMeaningfulAt: at('2026-09-13T09:30:00.000Z'),
        }),
      ],
    });

    expect(findNowPlayingInvariantViolations(plan.resolved)).toEqual([]);
  });
});
