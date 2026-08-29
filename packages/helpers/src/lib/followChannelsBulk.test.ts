import { describe, expect, it } from 'vitest';

import { summarizeBulkFollowResults } from './followChannelsBulk.js';

describe('summarizeBulkFollowResults', () => {
  it('counts each outcome and reports how many were requested', () => {
    expect(
      summarizeBulkFollowResults([
        { channel_id_text: 'a', outcome: 'followed' },
        { channel_id_text: 'b', outcome: 'already_following' },
        { channel_id_text: 'c', outcome: 'followed' },
        { channel_id_text: 'd', outcome: 'not_found' },
      ])
    ).toEqual({
      requested: 4,
      followed: 2,
      already_following: 1,
      not_found: 1,
    });
  });

  it('reports zeroes rather than omitting outcomes that did not occur', () => {
    expect(summarizeBulkFollowResults([])).toEqual({
      requested: 0,
      followed: 0,
      already_following: 0,
      not_found: 0,
    });
  });

  it('reports nothing followed when every channel was already followed', () => {
    const totals = summarizeBulkFollowResults([
      { channel_id_text: 'a', outcome: 'already_following' },
      { channel_id_text: 'b', outcome: 'already_following' },
    ]);

    expect(totals.followed).toBe(0);
    expect(totals.already_following).toBe(2);
  });
});
