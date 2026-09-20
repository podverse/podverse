import { describe, expect, it } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
import { detectDuckTypedPublisherMediumId } from '@podverse/parser-mapping';

import {
  extractPublisherParentsFromAlbumXml,
  isPublisherMusicRssXml,
} from './classifyPublisherMusicRss.js';

describe('isPublisherMusicRssXml', () => {
  it('returns true for a publisher feed whose remote items are mostly music', () => {
    const xml = `<?xml version="1.0"?>
<rss xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>Artist</title>
    <podcast:medium>publisher</podcast:medium>
    <podcast:remoteItem medium="music" feedGuid="a" />
    <podcast:remoteItem medium="music" feedGuid="b" />
    <podcast:remoteItem medium="podcast" feedGuid="c" />
  </channel>
</rss>`;
    expect(isPublisherMusicRssXml(xml)).toBe(true);
    expect(
      detectDuckTypedPublisherMediumId({
        medium: 'publisher',
        podcastRemoteItems: [{ medium: 'music' }, { medium: 'music' }, { medium: 'podcast' }],
      })
    ).toBe(MediumEnum.PublisherMusic);
  });

  it('returns false for a podcast publisher feed', () => {
    const xml = `<?xml version="1.0"?>
<rss xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>Network</title>
    <podcast:medium>publisher</podcast:medium>
    <podcast:remoteItem medium="podcast" feedGuid="a" />
    <podcast:remoteItem medium="podcast" feedGuid="b" />
  </channel>
</rss>`;
    expect(isPublisherMusicRssXml(xml)).toBe(false);
  });

  it('returns false when medium is music (album) rather than publisher', () => {
    const xml = `<?xml version="1.0"?>
<rss xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>Album</title>
    <podcast:medium>music</podcast:medium>
  </channel>
</rss>`;
    expect(isPublisherMusicRssXml(xml)).toBe(false);
  });
});

describe('extractPublisherParentsFromAlbumXml', () => {
  it('extracts publisher parents from podcast:publisher blocks', () => {
    const xml = `<?xml version="1.0"?>
<rss xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <podcast:medium>music</podcast:medium>
    <podcast:publisher>
      <podcast:remoteItem medium="publisher" feedGuid="abc" feedUrl="https://example.com/artist.xml"/>
    </podcast:publisher>
  </channel>
</rss>`;
    const parents = extractPublisherParentsFromAlbumXml(xml);
    expect(parents).toEqual([
      { feedUrl: 'https://example.com/artist.xml', feedGuid: 'abc' },
    ]);
  });
});
