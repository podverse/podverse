import { describe, expect, it, vi } from 'vitest';

import { findChannelItemByGuid } from './findChannelItemByGuid';

type PageItem = { guid: string; id_text: string };

const page = (items: PageItem[], count: number, limit: number) => ({
  items,
  meta: { count, limit },
});

describe('findChannelItemByGuid', () => {
  it('returns a page-1 match and does not fetch page 2', async () => {
    const fetchPage = vi.fn(async (pageNumber: number) => {
      if (pageNumber === 1) {
        return page([{ guid: 'item-1', id_text: 'idItem0000001' }], 40, 20);
      }
      return page([], 40, 20);
    });

    const found = await findChannelItemByGuid('item-1', fetchPage);

    expect(found).toEqual({ guid: 'item-1', id_text: 'idItem0000001' });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('fetches page 2 for a match there and stops', async () => {
    const fetchPage = vi.fn(async (pageNumber: number) => {
      if (pageNumber === 2) {
        return page([{ guid: 'item-2', id_text: 'idItem0000002' }], 40, 20);
      }
      return page([{ guid: 'other', id_text: 'idItem0000009' }], 40, 20);
    });

    const found = await findChannelItemByGuid('item-2', fetchPage);

    expect(found).toEqual({ guid: 'item-2', id_text: 'idItem0000002' });
    expect(fetchPage.mock.calls.map((call) => call[0])).toEqual([1, 2]);
  });

  it('returns null after the last page has no match', async () => {
    const fetchPage = vi.fn(async () => page([{ guid: 'other', id_text: 'idItem0000009' }], 1, 20));

    await expect(findChannelItemByGuid('missing', fetchPage)).resolves.toBeNull();
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when the guid is blank', async () => {
    const fetchPage = vi.fn(async () => page([], 0, 20));

    await expect(findChannelItemByGuid('   ', fetchPage)).resolves.toBeNull();
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('does not treat a guid match with a blank id text as a match', async () => {
    const fetchPage = vi.fn(async () => page([{ guid: 'item-1', id_text: '  ' }], 1, 20));

    await expect(findChannelItemByGuid('item-1', fetchPage)).resolves.toBeNull();
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('fetches page 2 when count 61 and limit 60 miss on page 1', async () => {
    const fetchPage = vi.fn(async (pageNumber: number) => {
      if (pageNumber === 1) {
        return page([{ guid: 'other', id_text: 'idItem0000009' }], 61, 60);
      }
      return page([], 61, 60);
    });

    await expect(findChannelItemByGuid('item-2', fetchPage)).resolves.toBeNull();
    expect(fetchPage.mock.calls.map((call) => call[0])).toEqual([1, 2]);
  });
});
