import { describe, expect, it } from 'vitest';

import { normalizeChannelRows, readChannelUpdatedAt, readUpdatedAt } from './homeFeedData';

describe('readUpdatedAt', () => {
  it('keeps a positive epoch and drops zero or non-finite values', () => {
    expect(readUpdatedAt(1_700_000_000)).toBe(1_700_000_000);
    expect(readUpdatedAt(0)).toBeNull();
    expect(readUpdatedAt(Number.NaN)).toBeNull();
  });

  it('keeps a parseable timestamp string and drops empty or junk', () => {
    expect(readUpdatedAt('2026-03-04T12:00:00.000Z')).toBe('2026-03-04T12:00:00.000Z');
    expect(readUpdatedAt('  ')).toBeNull();
    expect(readUpdatedAt('not-a-date')).toBeNull();
  });
});

describe('readChannelUpdatedAt', () => {
  it('prefers channel_about.last_pub_date over a top-level last_pub_date', () => {
    expect(
      readChannelUpdatedAt({
        channel_about: { last_pub_date: '2026-03-04T12:00:00.000Z' },
        last_pub_date: '2020-01-01T00:00:00.000Z',
      })
    ).toBe('2026-03-04T12:00:00.000Z');
  });

  it('falls back to a top-level last_pub_date', () => {
    expect(readChannelUpdatedAt({ last_pub_date: '2026-01-15T00:00:00.000Z' })).toBe(
      '2026-01-15T00:00:00.000Z'
    );
  });
});

describe('normalizeChannelRows', () => {
  it('copies last_pub_date onto the row as updatedAt', () => {
    const rows = normalizeChannelRows([
      {
        channel_about: { last_pub_date: '2026-03-04T12:00:00.000Z' },
        id_text: 'show-1',
        title: 'Example Show',
      },
    ]);

    expect(rows).toEqual([
      {
        id: 'show-1',
        imageUrl: null,
        subtitle: null,
        title: 'Example Show',
        updatedAt: '2026-03-04T12:00:00.000Z',
      },
    ]);
  });

  it('sets subtitle from channel_about.author when includeAuthor is true', () => {
    const rows = normalizeChannelRows(
      [
        {
          channel_about: {
            author: 'Adam Curry & John C. Dvorak',
            last_pub_date: '2026-03-04T12:00:00.000Z',
          },
          id_text: 'show-1',
          title: 'No Agenda Show',
        },
      ],
      { includeAuthor: true }
    );

    expect(rows[0]?.subtitle).toBe('Adam Curry & John C. Dvorak');
  });

  it('ignores channel_about.author when includeAuthor is omitted or false', () => {
    const payload = [
      {
        channel_about: {
          author: 'Adam Curry & John C. Dvorak',
          last_pub_date: '2026-03-04T12:00:00.000Z',
        },
        id_text: 'show-1',
        title: 'No Agenda Show',
      },
    ];

    expect(normalizeChannelRows(payload)[0]?.subtitle).toBeNull();
    expect(normalizeChannelRows(payload, { includeAuthor: false })[0]?.subtitle).toBeNull();
  });

  it('omits the subtitle when includeAuthor is true but author is empty', () => {
    const rows = normalizeChannelRows(
      [
        {
          channel_about: { author: '  ', last_pub_date: '2026-03-04T12:00:00.000Z' },
          id_text: 'show-1',
          title: 'Example Show',
        },
      ],
      { includeAuthor: true }
    );

    expect(rows[0]?.subtitle).toBeNull();
  });
});
