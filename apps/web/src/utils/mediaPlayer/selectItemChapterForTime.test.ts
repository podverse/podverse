import { describe, expect, it } from 'vitest';

import type { DTOItemChapter } from '@podverse/helpers';

import { selectItemChapterForTime } from './selectItemChapterForTime';

const ch = (
  over: Partial<DTOItemChapter> & Pick<DTOItemChapter, 'id' | 'table_of_contents'>
): DTOItemChapter => ({
  id_text: 't',
  item_chapters_feed_id: 1,
  data_hash: 'h',
  start_time: '0',
  end_time: '10',
  title: 'x',
  ...over,
});

describe('selectItemChapterForTime', () => {
  it('picks the chapter for a time in range, preferring table_of_contents false when both overlap', () => {
    const toc = ch({ id: 1, id_text: 'a', table_of_contents: true, title: 'Wrap' });
    const inner = ch({ id: 2, id_text: 'b', table_of_contents: false, title: 'Inner' });
    const r = selectItemChapterForTime([toc, inner], 5);
    expect(r?.id).toBe(2);
  });

  it('returns null when time is past the last end', () => {
    const a = ch({ id: 1, end_time: '1', table_of_contents: false });
    expect(selectItemChapterForTime([a], 2)).toBeNull();
  });

  // -- Boundary cases captured by the media-player decision matrix --
  // See apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md

  it('returns null on empty chapter list', () => {
    expect(selectItemChapterForTime([], 5)).toBeNull();
  });

  it('suppresses chapter match at exactly 0 when a chapter starts at or before 0', () => {
    const a = ch({ id: 1, start_time: '0', end_time: '10', table_of_contents: false });
    expect(selectItemChapterForTime([a], 0)).toBeNull();
  });

  it('matches after playhead passes 0 when chapter starts at 0', () => {
    const a = ch({ id: 1, start_time: '0', end_time: '10', table_of_contents: false });
    expect(selectItemChapterForTime([a], 0.1)?.id).toBe(1);
  });

  it('matches exactly at start_time when chapter starts after 0', () => {
    const a = ch({ id: 1, start_time: '5', end_time: '10', table_of_contents: false });
    expect(selectItemChapterForTime([a], 5)?.id).toBe(1);
  });

  it('does not match at exactly end_time (exclusive upper bound)', () => {
    const a = ch({ id: 1, start_time: '0', end_time: '10', table_of_contents: false });
    expect(selectItemChapterForTime([a], 10)).toBeNull();
  });

  it('skips chapters whose end_time is missing or non-numeric', () => {
    const noEnd = ch({
      id: 1,
      start_time: '0',
      end_time: null as unknown as string,
      table_of_contents: false,
    });
    const garbage = ch({
      id: 2,
      start_time: '0',
      end_time: 'not-a-number',
      table_of_contents: false,
    });
    const valid = ch({ id: 3, start_time: '0', end_time: '50', table_of_contents: false });
    expect(selectItemChapterForTime([noEnd, garbage, valid], 5)?.id).toBe(3);
  });

  it('returns null when time is negative', () => {
    const a = ch({ id: 1, start_time: '0', end_time: '10', table_of_contents: false });
    expect(selectItemChapterForTime([a], -1)).toBeNull();
  });

  it('accepts very large currentTime values without throwing', () => {
    const a = ch({ id: 1, start_time: '0', end_time: '1000000', table_of_contents: false });
    expect(selectItemChapterForTime([a], 999_999.99)?.id).toBe(1);
  });

  it('uses the first matching chapter when none have table_of_contents=false', () => {
    const a = ch({ id: 1, start_time: '0', end_time: '10', table_of_contents: true });
    const b = ch({ id: 2, start_time: '0', end_time: '10', table_of_contents: true });
    expect(selectItemChapterForTime([a, b], 5)?.id).toBe(1);
  });
});
