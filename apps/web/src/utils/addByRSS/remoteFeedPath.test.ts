import { describe, expect, it } from 'vitest';

import { ROUTES } from '../../constants/routes';
import {
  ADD_BY_RSS_REMOTE_FEED_TITLE_MAX_LENGTH,
  buildAddByRSSRemoteFeedPath,
} from './remoteFeedPath';

const FEED_URL = 'https://example.com/feed.xml';

const queryParams = (path: string): URLSearchParams => {
  const query = path.split('?')[1] ?? '';
  return new URLSearchParams(query);
};

describe('buildAddByRSSRemoteFeedPath', () => {
  it('builds a path with the feed URL and leaves the title out when it is null', () => {
    const path = buildAddByRSSRemoteFeedPath({ feedUrl: FEED_URL, title: null });

    expect(path.startsWith(`${ROUTES.ADD_BY_RSS_REMOTE_FEED}?`)).toBe(true);
    const params = queryParams(path);
    expect(params.get('feed_url')).toBe(FEED_URL);
    expect(params.has('title')).toBe(false);
  });

  it('includes a title with the feed URL', () => {
    const path = buildAddByRSSRemoteFeedPath({ feedUrl: FEED_URL, title: 'Remote Feed' });

    const params = queryParams(path);
    expect(params.get('feed_url')).toBe(FEED_URL);
    expect(params.get('title')).toBe('Remote Feed');
  });

  it('leaves out a blank title', () => {
    const path = buildAddByRSSRemoteFeedPath({ feedUrl: FEED_URL, title: '   ' });

    expect(queryParams(path).has('title')).toBe(false);
  });

  it('cuts a long title to 256 characters', () => {
    const path = buildAddByRSSRemoteFeedPath({
      feedUrl: FEED_URL,
      title: 'a'.repeat(ADD_BY_RSS_REMOTE_FEED_TITLE_MAX_LENGTH + 40),
    });

    const title = queryParams(path).get('title');
    expect(title).toBe('a'.repeat(ADD_BY_RSS_REMOTE_FEED_TITLE_MAX_LENGTH));
  });

  it('round-trips the feed URL through URLSearchParams unchanged', () => {
    const feedUrl = 'https://cdn.example.com/feeds/a b.xml?x=1&y=a=b';
    const path = buildAddByRSSRemoteFeedPath({ feedUrl, title: null });

    expect(queryParams(path).get('feed_url')).toBe(feedUrl);
  });
});
