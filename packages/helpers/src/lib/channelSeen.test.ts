import { describe, expect, it } from 'vitest';

import {
  CHANNEL_UNSEEN_COUNT_CAP,
  capUnseenCount,
  countUnseenByPubDate,
  describeUnseenBadge,
  isLaterLastSeenAt,
  mergeLastSeenAt,
} from './channelSeen.js';

const at = (iso: string) => Date.parse(iso);

describe('capUnseenCount', () => {
  it('reports a count below the cap exactly', () => {
    expect(capUnseenCount(3)).toEqual({ has_more_unseen: false, unseen_count: 3 });
  });

  it('reports exactly the cap without claiming there is more', () => {
    expect(capUnseenCount(CHANNEL_UNSEEN_COUNT_CAP)).toEqual({
      has_more_unseen: false,
      unseen_count: CHANNEL_UNSEEN_COUNT_CAP,
    });
  });

  it('flags overflow once past the cap', () => {
    expect(capUnseenCount(CHANNEL_UNSEEN_COUNT_CAP + 1)).toEqual({
      has_more_unseen: true,
      unseen_count: CHANNEL_UNSEEN_COUNT_CAP,
    });
    expect(capUnseenCount(5000)).toEqual({
      has_more_unseen: true,
      unseen_count: CHANNEL_UNSEEN_COUNT_CAP,
    });
  });

  it('treats a negative or unusable count as nothing unseen', () => {
    expect(capUnseenCount(-1).unseen_count).toBe(0);
    expect(capUnseenCount(Number.NaN).unseen_count).toBe(0);
  });
});

describe('countUnseenByPubDate', () => {
  it('counts only what published after the channel was last seen', () => {
    const result = countUnseenByPubDate({
      lastSeenAtMs: at('2026-08-20T00:00:00.000Z'),
      pubDatesMs: [
        at('2026-08-22T00:00:00.000Z'),
        at('2026-08-21T00:00:00.000Z'),
        at('2026-08-19T00:00:00.000Z'),
      ],
    });

    expect(result).toEqual({ has_more_unseen: false, unseen_count: 2 });
  });

  it('treats an item published at the exact moment as seen', () => {
    const seenAt = at('2026-08-20T00:00:00.000Z');
    const result = countUnseenByPubDate({ lastSeenAtMs: seenAt, pubDatesMs: [seenAt] });

    expect(result.unseen_count).toBe(0);
  });

  it('reads a never-opened channel as nothing unseen rather than everything', () => {
    const result = countUnseenByPubDate({
      lastSeenAtMs: null,
      pubDatesMs: [at('2026-08-22T00:00:00.000Z'), at('2026-08-21T00:00:00.000Z')],
    });

    expect(result).toEqual({ has_more_unseen: false, unseen_count: 0 });
  });

  it('ignores undated items instead of counting them as new', () => {
    const result = countUnseenByPubDate({
      lastSeenAtMs: at('2026-08-20T00:00:00.000Z'),
      pubDatesMs: [null, at('2026-08-22T00:00:00.000Z'), null],
    });

    expect(result.unseen_count).toBe(1);
  });

  it('caps a long backlog rather than counting all of it', () => {
    const base = at('2026-08-20T00:00:00.000Z');
    const pubDatesMs = Array.from(
      { length: 500 },
      (_value, index) => base + (index + 1) * 60 * 1000
    );

    expect(countUnseenByPubDate({ lastSeenAtMs: base, pubDatesMs })).toEqual({
      has_more_unseen: true,
      unseen_count: CHANNEL_UNSEEN_COUNT_CAP,
    });
  });
});

describe('describeUnseenBadge', () => {
  it('shows nothing on a channel the user is caught up on', () => {
    expect(describeUnseenBadge({ has_more_unseen: false, unseen_count: 0 })).toBeNull();
  });

  it('states a small count exactly', () => {
    expect(describeUnseenBadge({ has_more_unseen: false, unseen_count: 4 })).toEqual({
      count: 4,
      isCapped: false,
    });
  });

  it('reads exactly the cap as a number, not as an overflow', () => {
    // The difference between this and the case below is the whole reason the count and the
    // overflow flag are separate values.
    expect(
      describeUnseenBadge({ has_more_unseen: false, unseen_count: CHANNEL_UNSEEN_COUNT_CAP })
    ).toEqual({ count: CHANNEL_UNSEEN_COUNT_CAP, isCapped: false });
  });

  it('reads an overflow as capped', () => {
    expect(
      describeUnseenBadge({ has_more_unseen: true, unseen_count: CHANNEL_UNSEEN_COUNT_CAP })
    ).toEqual({ count: CHANNEL_UNSEEN_COUNT_CAP, isCapped: true });
  });

  it('holds a count above the cap down to it, so a caller cannot render a raw total', () => {
    expect(describeUnseenBadge({ has_more_unseen: true, unseen_count: 900 })).toEqual({
      count: CHANNEL_UNSEEN_COUNT_CAP,
      isCapped: true,
    });
  });
});

describe('mergeLastSeenAt', () => {
  const earlier = '2026-08-20T00:00:00.000Z';
  const later = '2026-08-22T00:00:00.000Z';

  it('keeps the later timestamp whichever side it arrives on', () => {
    expect(mergeLastSeenAt(earlier, later)).toBe(later);
    expect(mergeLastSeenAt(later, earlier)).toBe(later);
  });

  it('adopts a timestamp when the other side has none', () => {
    expect(mergeLastSeenAt(null, later)).toBe(later);
    expect(mergeLastSeenAt(later, null)).toBe(later);
  });

  it('stays null when neither side has been seen', () => {
    expect(mergeLastSeenAt(null, null)).toBeNull();
    expect(mergeLastSeenAt(undefined, null)).toBeNull();
  });

  it('is idempotent, so repeated merges never drift', () => {
    const once = mergeLastSeenAt(earlier, later);
    expect(mergeLastSeenAt(once, later)).toBe(later);
    expect(mergeLastSeenAt(once, earlier)).toBe(later);
  });

  it('ignores an unparseable timestamp rather than adopting it', () => {
    expect(mergeLastSeenAt(later, 'not a date')).toBe(later);
    expect(mergeLastSeenAt('not a date', later)).toBe(later);
  });
});

describe('isLaterLastSeenAt', () => {
  const earlier = '2026-08-20T00:00:00.000Z';
  const later = '2026-08-22T00:00:00.000Z';

  it('is true only when the candidate moves the stored value forward', () => {
    expect(isLaterLastSeenAt(later, earlier)).toBe(true);
    expect(isLaterLastSeenAt(earlier, later)).toBe(false);
    expect(isLaterLastSeenAt(later, later)).toBe(false);
  });

  it('treats any timestamp as later than none', () => {
    expect(isLaterLastSeenAt(earlier, null)).toBe(true);
  });

  it('is false without a usable candidate', () => {
    expect(isLaterLastSeenAt(null, earlier)).toBe(false);
    expect(isLaterLastSeenAt('not a date', null)).toBe(false);
  });
});
