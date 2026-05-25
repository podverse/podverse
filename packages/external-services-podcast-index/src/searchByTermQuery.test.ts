import { describe, expect, it } from 'vitest';

import {
  buildPodcastIndexSearchByTermQuery,
  podcastIndexSearchByTermPath,
} from './searchByTermQuery.js';

describe('buildPodcastIndexSearchByTermQuery', () => {
  it('includes q and max with defaults', () => {
    expect(buildPodcastIndexSearchByTermQuery('jazz')).toBe('q=jazz&max=25');
  });

  it('clamps max and encodes the term', () => {
    const query = buildPodcastIndexSearchByTermQuery('a b', { max: 5000, clean: true });
    expect(query).toBe('q=a%20b&max=1000&clean');
  });
});

describe('podcastIndexSearchByTermPath', () => {
  it('builds general search by term URL', () => {
    expect(
      podcastIndexSearchByTermPath(
        'https://api.podcastindex.org/api/1.0',
        '/search/byterm',
        'test',
        {
          max: 50,
        }
      )
    ).toBe('https://api.podcastindex.org/api/1.0/search/byterm?q=test&max=50');
  });

  it('builds music search by term URL', () => {
    expect(
      podcastIndexSearchByTermPath(
        'https://api.podcastindex.org/api/1.0',
        '/search/music/byterm',
        'album',
        { max: 50 }
      )
    ).toBe('https://api.podcastindex.org/api/1.0/search/music/byterm?q=album&max=50');
  });
});
