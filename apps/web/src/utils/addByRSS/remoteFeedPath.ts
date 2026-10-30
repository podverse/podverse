import { ROUTES } from '../../constants/routes';

export const ADD_BY_RSS_REMOTE_FEED_TITLE_MAX_LENGTH = 256;

export const buildAddByRSSRemoteFeedPath = (input: {
  feedUrl: string;
  title: string | null;
}): string => {
  const params = new URLSearchParams({ feed_url: input.feedUrl });
  const title = input.title?.trim() ?? '';
  if (title !== '') {
    params.set('title', title.slice(0, ADD_BY_RSS_REMOTE_FEED_TITLE_MAX_LENGTH));
  }
  return `${ROUTES.ADD_BY_RSS_REMOTE_FEED}?${params.toString()}`;
};
