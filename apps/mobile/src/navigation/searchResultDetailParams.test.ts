import { describe, expect, it } from 'vitest';

import type { DTOIndexProviderFeedTarget } from '@podverse/helpers';

import { buildSearchResultDetailParams } from './searchResultDetailParams';

const fullTarget: DTOIndexProviderFeedTarget = {
  author: 'Host',
  feed_url: 'https://example.com/feed.xml',
  image_url: 'https://example.com/art.jpg',
  index_provider: 'podcast_index',
  provider_feed_id: '920666',
  title: 'Show',
};

describe('buildSearchResultDetailParams', () => {
  it('maps every field and never sets description', () => {
    expect(buildSearchResultDetailParams(fullTarget)).toEqual({
      author: 'Host',
      feedUrl: 'https://example.com/feed.xml',
      imageUrl: 'https://example.com/art.jpg',
      indexProvider: 'podcast_index',
      resultId: '920666',
      title: 'Show',
    });
    expect(buildSearchResultDetailParams(fullTarget)).not.toHaveProperty('description');
  });

  it('omits a null title and author and keeps a null image', () => {
    expect(
      buildSearchResultDetailParams({
        ...fullTarget,
        author: null,
        image_url: null,
        title: null,
      })
    ).toEqual({
      feedUrl: 'https://example.com/feed.xml',
      imageUrl: null,
      indexProvider: 'podcast_index',
      resultId: '920666',
    });
  });
});
