import { describe, expect, it } from 'vitest';

import type { PIChapter } from '../../types/partytime.js';
import { compatParsedChapters } from './chapters.js';

const chapter = (overrides: Partial<PIChapter> & Pick<PIChapter, 'startTime'>): PIChapter => ({
  endTime: null,
  title: null,
  img: null,
  url: null,
  toc: true,
  ...overrides,
});

describe('compatParsedChapters', () => {
  it('drops a chapter whose start cannot fit and stores an out-of-range end as null', () => {
    const rows = compatParsedChapters([
      chapter({ startTime: String(1e8), title: 'too late' }),
      chapter({ startTime: '12', endTime: String(1e8), title: 'open end' }),
    ]);

    expect(
      rows.map((row) => ({
        start_time: row.start_time,
        end_time: row.end_time,
        title: row.title,
      }))
    ).toEqual([{ start_time: '12.00', end_time: null, title: 'open end' }]);
  });

  it('stores numeric chapter times from chapters JSON', () => {
    const rows = compatParsedChapters([
      chapter({ startTime: 0, title: 'Intro' }),
      chapter({ startTime: 95, endTime: 120, title: 'Topic' }),
    ]);

    expect(
      rows.map((row) => ({
        start_time: row.start_time,
        end_time: row.end_time,
        title: row.title,
      }))
    ).toEqual([
      { start_time: '0.00', end_time: null, title: 'Intro' },
      { start_time: '95.00', end_time: '120.00', title: 'Topic' },
    ]);
  });
});
