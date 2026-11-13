import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchAddByRssItemSectionsOnDevice,
  itemSectionsFromDeviceBodies,
} from './deviceItemSections';
import { fetchAddByRssResourceOnDevice } from './deviceParse';

vi.mock('./deviceParse', () => ({ fetchAddByRssResourceOnDevice: vi.fn() }));

const fetchResource = vi.mocked(fetchAddByRssResourceOnDevice);

const ITEM_ID_TEXT = 'abr-item-1';
const FEED_URL = 'https://feeds.example.com/show/feed.rss';

const CHAPTERS_BODY = JSON.stringify({
  version: '1.2.0',
  chapters: [
    { startTime: 0, title: 'Intro' },
    { startTime: 95, title: 'Topic' },
  ],
});

const VTT_BODY = `WEBVTT

00:00:00.000 --> 00:00:04.000
<v Host>Welcome to the show.

00:00:04.000 --> 00:00:09.000
<v Guest>Thanks for having me.
`;

describe('itemSectionsFromDeviceBodies', () => {
  it('builds chapter ids from the item and ends each chapter at the next one', () => {
    const sections = itemSectionsFromDeviceBodies({
      chaptersBody: CHAPTERS_BODY,
      itemIdText: ITEM_ID_TEXT,
      transcriptBody: null,
    });

    expect(sections.chapters.map((chapter) => chapter.id_text)).toEqual([
      `${ITEM_ID_TEXT}-ch-0`,
      `${ITEM_ID_TEXT}-ch-1`,
    ]);
    expect(Number(sections.chapters[0]?.end_time)).toBe(95);
    expect(sections.chapters[1]?.title).toBe('Topic');
  });

  it('gives no chapters for a body that is not JSON or has no chapters array', () => {
    for (const chaptersBody of [
      '<html>Not found</html>',
      '{"version":"1.2.0"}',
      '{"chapters":3}',
    ]) {
      const sections = itemSectionsFromDeviceBodies({
        chaptersBody,
        itemIdText: ITEM_ID_TEXT,
        transcriptBody: null,
      });
      expect(sections.chapters).toEqual([]);
    }
  });

  it('parses a VTT transcript body into rows', () => {
    const sections = itemSectionsFromDeviceBodies({
      chaptersBody: null,
      itemIdText: ITEM_ID_TEXT,
      transcriptBody: VTT_BODY,
    });

    expect(sections.transcriptRows.length).toBeGreaterThan(0);
    expect(sections.transcriptRows.map((row) => row.body).join(' ')).toContain(
      'Welcome to the show.'
    );
  });

  it('gives empty sections when neither file was fetched', () => {
    expect(
      itemSectionsFromDeviceBodies({
        chaptersBody: null,
        itemIdText: ITEM_ID_TEXT,
        transcriptBody: null,
      })
    ).toEqual({ chapters: [], transcriptRows: [] });
  });
});

describe('fetchAddByRssItemSectionsOnDevice', () => {
  beforeEach(() => {
    fetchResource.mockReset();
  });

  it('fetches only the linked file, scoped to the feed', async () => {
    fetchResource.mockResolvedValueOnce({ body: CHAPTERS_BODY, status: 200 });

    const sections = await fetchAddByRssItemSectionsOnDevice({
      credentials: null,
      feedUrl: FEED_URL,
      itemIdText: ITEM_ID_TEXT,
      urls: {
        chaptersFeedUrl: 'https://feeds.example.com/chapters.json',
        transcriptUrl: undefined,
      },
    });

    expect(fetchResource).toHaveBeenCalledTimes(1);
    expect(fetchResource.mock.calls[0]?.[0]).toMatchObject({
      feedUrl: FEED_URL,
      url: 'https://feeds.example.com/chapters.json',
    });
    expect(sections.chapters).toHaveLength(2);
    expect(sections.transcriptRows).toEqual([]);
  });

  it('throws naming the file and status when a file answers outside 2xx', async () => {
    fetchResource
      .mockResolvedValueOnce({ body: CHAPTERS_BODY, status: 200 })
      .mockResolvedValueOnce({ body: '', status: 404 });

    await expect(
      fetchAddByRssItemSectionsOnDevice({
        credentials: null,
        feedUrl: FEED_URL,
        itemIdText: ITEM_ID_TEXT,
        urls: {
          chaptersFeedUrl: 'https://feeds.example.com/chapters.json',
          transcriptUrl: 'https://feeds.example.com/transcript.vtt',
        },
      })
    ).rejects.toThrow('transcript file answered HTTP 404');
  });
});
