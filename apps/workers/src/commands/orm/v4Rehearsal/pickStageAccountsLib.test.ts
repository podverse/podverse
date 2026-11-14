/**
 * In-memory stage pick. These tests do not open a database.
 */

import { describe, expect, it } from 'vitest';

import type { PilotMatchLists, StageAccountPick } from './pickStageAccountsLib.js';
import {
  ADD_BY_RSS_CAP_DEFAULT,
  DIRECTORY_FOLLOW_CAP_DEFAULT,
  PILOT_RULE_ORDER,
  PILOT_TARGET,
  PLAYLIST_RESOURCE_CAP,
  REHEARSAL_V4_ID,
  SAMPLE_TARGET,
  assembleStagePick,
} from './pickStageAccountsLib.js';

function numberedIds(prefix: string, count: number): string[] {
  const ids: string[] = [];
  for (let index = 1; index <= count; index += 1) {
    ids.push(`${prefix}${index}`);
  }
  return ids;
}

function emptyMatches(overrides: Partial<PilotMatchLists> = {}): PilotMatchLists {
  return {
    rehearsal: [],
    largest_add_by_rss: [],
    largest_subscriptions: [],
    largest_clips: [],
    largest_history: [],
    largest_playlists: [],
    largest_playlist_size: [],
    just_over_add_by_rss: [],
    just_over_directory_follows: [],
    just_over_playlist_size: [],
    email_case_twin: [],
    paid_far: [],
    paid_soon: [],
    trial: [],
    expired: [],
    unverified_with_lists: [],
    unverified_without_lists: [],
    follows_account: [],
    default_playlist: [],
    no_activity: [],
    ...overrides,
  };
}

function picked(v4Id: string, rule: StageAccountPick['rule']): StageAccountPick {
  return { v4Id, rule };
}

describe('assembleStagePick', () => {
  it('keeps the earlier rule and fills distinct random ids to the pilot target', () => {
    const filler = numberedIds('r', PILOT_TARGET);
    const pick = assembleStagePick({
      stage: 'pilot',
      matches: emptyMatches({
        rehearsal: [REHEARSAL_V4_ID],
        largest_add_by_rss: [REHEARSAL_V4_ID, 'a1'],
      }),
      randomIds: [REHEARSAL_V4_ID, 'a1', 'a1', ...filler],
    });

    expect(pick).toEqual([
      picked(REHEARSAL_V4_ID, 'rehearsal'),
      picked('a1', 'largest_add_by_rss'),
      ...filler.slice(0, PILOT_TARGET - 2).map((v4Id) => picked(v4Id, 'random')),
    ]);
  });

  it('adds no random row when rule matches already reach the pilot target', () => {
    const twins = numberedIds('t', PILOT_TARGET);
    const pick = assembleStagePick({
      stage: 'pilot',
      matches: emptyMatches({ email_case_twin: twins }),
      randomIds: ['r1', 'r2'],
    });

    expect(pick).toEqual(twins.map((v4Id) => picked(v4Id, 'email_case_twin')));
  });

  it('takes the next unused id when earlier rules claimed the first ones', () => {
    const pick = assembleStagePick({
      stage: 'pilot',
      matches: emptyMatches({
        largest_playlists: ['pl1'],
        largest_playlist_size: ['pl1', 'pl2'],
        just_over_add_by_rss: ['j1'],
        just_over_playlist_size: ['pl1', 'pl2'],
        paid_far: ['far1'],
        paid_soon: ['pl1', 'far1', 'p1', 'p2', 'p3', 'p4', 'p5'],
      }),
      randomIds: [],
    });

    expect(pick).toEqual([
      picked('pl1', 'largest_playlists'),
      picked('pl2', 'largest_playlist_size'),
      picked('j1', 'just_over_add_by_rss'),
      picked('far1', 'paid'),
      picked('p1', 'paid'),
      picked('p2', 'paid'),
      picked('p3', 'paid'),
      picked('p4', 'paid'),
    ]);
  });

  it('keeps every unused email twin past the pilot target', () => {
    const twins = numberedIds('t', PILOT_TARGET);
    const pick = assembleStagePick({
      stage: 'pilot',
      matches: emptyMatches({
        rehearsal: [REHEARSAL_V4_ID],
        email_case_twin: [REHEARSAL_V4_ID, ...twins],
      }),
      randomIds: ['r1'],
    });

    expect(pick).toEqual([
      picked(REHEARSAL_V4_ID, 'rehearsal'),
      ...twins.map((v4Id) => picked(v4Id, 'email_case_twin')),
    ]);
  });

  it('returns sample and full ids in input order and skips a missing rehearsal id', () => {
    const ordered = ['s0', ...numberedIds('s', SAMPLE_TARGET + 4)];
    const sample = assembleStagePick({
      stage: 'sample',
      randomIds: ['s0', ...ordered],
    });

    expect(sample).toEqual(ordered.slice(0, SAMPLE_TARGET).map((v4Id) => picked(v4Id, 'random')));

    expect(assembleStagePick({ stage: 'sample', randomIds: ['a1', 'a2', 'a1'] })).toEqual([
      picked('a1', 'random'),
      picked('a2', 'random'),
    ]);

    const extra = numberedIds('f', SAMPLE_TARGET + 1);
    const full = assembleStagePick({
      stage: 'full',
      fullIds: ['b2', 'b1', 'b2', ...extra],
    });

    expect(full).toEqual(['b2', 'b1', ...extra].map((v4Id) => picked(v4Id, 'all')));
    expect(
      assembleStagePick({
        stage: 'pilot',
        matches: emptyMatches({ rehearsal: ['a1'] }),
        randomIds: [],
      })
    ).toEqual([]);
  });

  it('rejects a non-string or empty id without including the value', () => {
    const badNumber = 8675309;
    const fromNumber = thrown(() => {
      assembleStagePick({
        stage: 'sample',
        randomIds: idList([badNumber]),
      });
    });
    expect(fromNumber.message).toBe('Could not read v4 accounts.');
    expect(fromNumber.message.includes(String(badNumber))).toBe(false);

    expect(() => {
      assembleStagePick({ stage: 'full', fullIds: [''] });
    }).toThrowError(new Error('Could not read v4 accounts.'));

    expect(() => {
      assembleStagePick({
        stage: 'pilot',
        matches: emptyMatches({ trial: ['   '] }),
        randomIds: [],
      });
    }).toThrowError(new Error('Could not read v4 accounts.'));
  });

  it('exports the pilot, sample, and cap thresholds', () => {
    expect({
      pilot: PILOT_TARGET,
      sample: SAMPLE_TARGET,
      addByRss: ADD_BY_RSS_CAP_DEFAULT,
      directoryFollows: DIRECTORY_FOLLOW_CAP_DEFAULT,
      playlistResources: PLAYLIST_RESOURCE_CAP,
    }).toEqual({
      pilot: 100,
      sample: 1000,
      addByRss: 100,
      directoryFollows: 500,
      playlistResources: 10000,
    });
    expect(PILOT_RULE_ORDER).toEqual([
      'rehearsal',
      'largest_add_by_rss',
      'largest_subscriptions',
      'largest_clips',
      'largest_history',
      'largest_playlists',
      'largest_playlist_size',
      'just_over_add_by_rss',
      'just_over_directory_follows',
      'just_over_playlist_size',
      'email_case_twin',
      'paid',
      'trial',
      'expired',
      'unverified',
      'follows_account',
      'default_playlist',
      'no_activity',
      'random',
    ]);
  });
});

function thrown(run: () => void): Error {
  try {
    run();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
  }
  throw new Error('expected a throw');
}

function idList(values: readonly unknown[]): readonly string[] {
  // Rows are checked at runtime. This fixture passes a value the parameter type excludes.
  return values as readonly string[];
}
