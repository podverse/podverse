import { describe, expect, it } from 'vitest';

import type { DTOItem } from '@podverse/helpers/dto';

import type { ChannelItemWindow } from './channelItemWindow';
import {
  CHANNEL_ITEM_STALE_AFTER_MS,
  CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH,
  CHANNEL_ITEM_WINDOW_MAX_DEPTH,
  CHANNEL_ITEM_WINDOW_STEP,
  clampChannelItemWindowDepth,
  extendChannelItemWindowDepth,
  getItemPrimaryImageUrl,
  isChannelItemWindowAtMaxDepth,
  isLastChannelItemPage,
  nextChannelItemPage,
  reconcileChannelItems,
  selectStaleChannelWindows,
  toChannelItemRecord,
} from './channelItemWindow';

const fetched = (itemIdText: string) => ({ itemIdText });

const stored = (itemIdText: string) => ({ itemIdText });

/** A whole feed's worth of ids, newest first, for the bounded-growth assertions. */
const feedOf = (count: number, prefix = 'ep') =>
  Array.from({ length: count }, (_value, index) => fetched(`${prefix}${index}`));

const channelWindow = (partial: Partial<ChannelItemWindow>): ChannelItemWindow => ({
  channelIdText: 'chan1',
  depth: CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH,
  syncedAtMs: null,
  ...partial,
});

const itemImage = (url: string) => ({
  id: 1,
  image_width_size: null,
  is_resized: false,
  item_id: 1,
  url,
});

const item = (partial: Partial<DTOItem>): DTOItem => ({
  channel_id: 1,
  id: 1,
  id_text: 'ep1',
  item_about: { id: 1, item_id: 1 },
  item_chat: { id: 1, item_id: 1, server: '' },
  item_content_links: [],
  item_enclosures: [],
  item_flag_status_id: 1,
  item_fundings: [],
  item_images: [],
  item_license: { id: 1, item_id: 1, identifier: '', url: null },
  item_location: { id: 1, item_id: 1, name: null },
  item_persons: [],
  item_season: { id: 1, channel_season_id: 1, item_id: 1, title: null },
  item_social_interacts: [],
  item_soundbites: [],
  item_transcripts: [],
  item_txts: [],
  item_values: [],
  ...partial,
});

describe('clampChannelItemWindowDepth', () => {
  it('never returns less than the default depth', () => {
    expect(clampChannelItemWindowDepth(0)).toBe(CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH);
    expect(clampChannelItemWindowDepth(-10)).toBe(CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH);
    expect(clampChannelItemWindowDepth(Number.NaN)).toBe(CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH);
  });

  it('caps at the per-channel ceiling', () => {
    expect(clampChannelItemWindowDepth(10000)).toBe(CHANNEL_ITEM_WINDOW_MAX_DEPTH);
  });
});

describe('extendChannelItemWindowDepth', () => {
  it('reaches one step further back each time', () => {
    const first = extendChannelItemWindowDepth(CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH);
    expect(first).toBe(CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH + CHANNEL_ITEM_WINDOW_STEP);
    expect(extendChannelItemWindowDepth(first)).toBe(first + CHANNEL_ITEM_WINDOW_STEP);
  });

  it('stops at the ceiling instead of growing past it', () => {
    expect(extendChannelItemWindowDepth(CHANNEL_ITEM_WINDOW_MAX_DEPTH)).toBe(
      CHANNEL_ITEM_WINDOW_MAX_DEPTH
    );
    expect(isChannelItemWindowAtMaxDepth(CHANNEL_ITEM_WINDOW_MAX_DEPTH)).toBe(true);
    expect(isChannelItemWindowAtMaxDepth(CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH)).toBe(false);
  });
});

describe('nextChannelItemPage', () => {
  it('asks for another page while the window is unfilled', () => {
    const next = nextChannelItemPage({
      depth: 100,
      fetchedCount: 60,
      lastPage: 1,
      lastPageCount: 60,
      lastPageLimit: 60,
    });
    expect(next).toBe(2);
  });

  it('stops once the window is filled', () => {
    const next = nextChannelItemPage({
      depth: 50,
      fetchedCount: 60,
      lastPage: 1,
      lastPageCount: 60,
      lastPageLimit: 60,
    });
    expect(next).toBeNull();
  });

  it('stops on a short page without spending a round trip on an empty one', () => {
    const next = nextChannelItemPage({
      depth: 500,
      fetchedCount: 30,
      lastPage: 1,
      lastPageCount: 30,
      lastPageLimit: 60,
    });
    expect(next).toBeNull();
  });

  it('stops when a page comes back empty', () => {
    const next = nextChannelItemPage({
      depth: 500,
      fetchedCount: 60,
      lastPage: 2,
      lastPageCount: 0,
      lastPageLimit: 60,
    });
    expect(next).toBeNull();
  });
});

describe('isLastChannelItemPage', () => {
  it('reads a full page as more to come', () => {
    expect(isLastChannelItemPage({ lastPageCount: 60, lastPageLimit: 60 })).toBe(false);
  });

  it('reads a short or empty page as the end of the feed', () => {
    expect(isLastChannelItemPage({ lastPageCount: 30, lastPageLimit: 60 })).toBe(true);
    expect(isLastChannelItemPage({ lastPageCount: 0, lastPageLimit: 60 })).toBe(true);
  });
});

describe('selectStaleChannelWindows', () => {
  const nowMs = Date.parse('2026-08-29T12:00:00.000Z');

  it('always includes a channel that has never synced', () => {
    const windows = [channelWindow({ channelIdText: 'fresh', syncedAtMs: nowMs })];
    const selected = selectStaleChannelWindows({
      nowMs,
      windows: [...windows, channelWindow({ channelIdText: 'never' })],
    });
    expect(selected.map((window) => window.channelIdText)).toEqual(['never']);
  });

  it('leaves recently synced channels alone', () => {
    const selected = selectStaleChannelWindows({
      nowMs,
      windows: [
        channelWindow({ channelIdText: 'recent', syncedAtMs: nowMs - 60_000 }),
        channelWindow({ channelIdText: 'stale', syncedAtMs: nowMs - CHANNEL_ITEM_STALE_AFTER_MS }),
      ],
    });
    expect(selected.map((window) => window.channelIdText)).toEqual(['stale']);
  });

  it('takes everything when the caller asks on purpose', () => {
    const selected = selectStaleChannelWindows({
      nowMs,
      staleAfterMs: 0,
      windows: [
        channelWindow({ channelIdText: 'recent', syncedAtMs: nowMs }),
        channelWindow({ channelIdText: 'stale', syncedAtMs: nowMs - CHANNEL_ITEM_STALE_AFTER_MS }),
      ],
    });
    expect(selected.map((window) => window.channelIdText)).toEqual(['recent', 'stale']);
  });
});

describe('reconcileChannelItems', () => {
  it('converges without duplicating or deleting when the feed has not moved', () => {
    const feed = [fetched('ep3'), fetched('ep2'), fetched('ep1')];
    const first = reconcileChannelItems({ depth: 50, fetched: feed, stored: [] });
    expect(first.keep.map((entry) => entry.itemIdText)).toEqual(['ep3', 'ep2', 'ep1']);
    expect(first.removeIdTexts).toEqual([]);

    const second = reconcileChannelItems({ depth: 50, fetched: feed, stored: first.keep });
    expect(second.keep).toEqual(first.keep);
    expect(second.removeIdTexts).toEqual([]);
  });

  it('retires an item the feed no longer carries', () => {
    const result = reconcileChannelItems({
      depth: 50,
      fetched: [fetched('ep3'), fetched('ep1')],
      stored: [stored('ep3'), stored('ep2'), stored('ep1')],
    });
    expect(result.keep.map((entry) => entry.itemIdText)).toEqual(['ep3', 'ep1']);
    expect(result.removeIdTexts).toEqual(['ep2']);
  });

  it('collapses an item that a mid-walk publish delivered on two pages', () => {
    const result = reconcileChannelItems({
      depth: 50,
      fetched: [fetched('ep2'), fetched('ep1'), fetched('ep1')],
      stored: [],
    });
    expect(result.keep.map((entry) => entry.itemIdText)).toEqual(['ep2', 'ep1']);
  });

  it('drops an item with no stable identity to store it under', () => {
    const result = reconcileChannelItems({
      depth: 50,
      fetched: [fetched('ep2'), fetched(''), fetched('ep1')],
      stored: [],
    });
    expect(result.keep.map((entry) => entry.itemIdText)).toEqual(['ep2', 'ep1']);
  });

  it('keeps a large feed bounded by the window rather than by the feed', () => {
    const result = reconcileChannelItems({ depth: 50, fetched: feedOf(5000), stored: [] });
    expect(result.keep).toHaveLength(50);
    expect(result.keep[0]?.itemIdText).toBe('ep0');
    expect(result.keep.at(-1)?.itemIdText).toBe('ep49');
  });

  it('never exceeds the ceiling even when asked for a deeper window', () => {
    const result = reconcileChannelItems({
      depth: CHANNEL_ITEM_WINDOW_MAX_DEPTH * 4,
      fetched: feedOf(5000),
      stored: [],
    });
    expect(result.keep).toHaveLength(CHANNEL_ITEM_WINDOW_MAX_DEPTH);
  });

  it('evicts the items that new episodes pushed past the window', () => {
    const previous = reconcileChannelItems({ depth: 50, fetched: feedOf(50, 'old'), stored: [] });
    const refreshed = reconcileChannelItems({
      depth: 50,
      fetched: [...feedOf(10, 'new'), ...feedOf(50, 'old')],
      stored: previous.keep,
    });

    expect(refreshed.keep).toHaveLength(50);
    expect(refreshed.removeIdTexts).toEqual(
      Array.from({ length: 10 }, (_value, index) => `old${40 + index}`)
    );
  });
});

describe('getItemPrimaryImageUrl', () => {
  it('prefers the item artwork over the channel artwork', () => {
    const url = getItemPrimaryImageUrl({
      channel: { channel_images: [{ url: 'https://example.com/chan.jpg' }] },
      item_images: [{ url: 'https://example.com/ep.jpg' }],
    });
    expect(url).toBe('https://example.com/ep.jpg');
  });

  it('falls back to the channel artwork when the item carries none', () => {
    const url = getItemPrimaryImageUrl({
      channel: { channel_images: [{ url: 'https://example.com/chan.jpg' }] },
      item_images: [],
    });
    expect(url).toBe('https://example.com/chan.jpg');
  });

  it('returns null when neither carries artwork', () => {
    expect(getItemPrimaryImageUrl({ item_images: [] })).toBeNull();
  });
});

describe('toChannelItemRecord', () => {
  it('indexes the fields the list is ordered and rendered by', () => {
    const record = toChannelItemRecord(
      'chan1',
      item({
        id_text: 'ep1',
        item_images: [itemImage('https://example.com/ep1.jpg')],
        pub_date: '2026-08-29T06:00:00.000Z',
        title: 'Episode One',
      })
    );

    expect(record).toMatchObject({
      channelIdText: 'chan1',
      imageUrl: 'https://example.com/ep1.jpg',
      itemIdText: 'ep1',
      pubDateMs: Date.parse('2026-08-29T06:00:00.000Z'),
      title: 'Episode One',
    });
  });

  it('stores an undated item rather than dropping it', () => {
    const record = toChannelItemRecord('chan1', item({ pub_date: 'not a date' }));
    expect(record?.pubDateMs).toBeNull();
  });

  it('drops an item with no id_text', () => {
    expect(toChannelItemRecord('chan1', item({ id_text: '  ' }))).toBeNull();
  });
});
