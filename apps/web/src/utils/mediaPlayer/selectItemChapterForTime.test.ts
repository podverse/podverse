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
});
