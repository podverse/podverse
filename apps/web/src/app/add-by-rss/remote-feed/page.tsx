import { notFound } from 'next/navigation';

import { isValidHttpUrl } from '@podverse/helpers-validation';

import { ADD_BY_RSS_REMOTE_FEED_TITLE_MAX_LENGTH } from '../../../utils/addByRSS/remoteFeedPath';
import { AddByRSSRemoteFeedPageClient } from './AddByRSSRemoteFeedPageClient';

type AddByRSSRemoteFeedPageProps = {
  searchParams: Promise<{ feed_url?: string | string[]; title?: string | string[] }>;
};

const firstSearchParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? '';
  }
  return value?.trim() ?? '';
};

export default async function AddByRSSRemoteFeedPage({
  searchParams,
}: AddByRSSRemoteFeedPageProps) {
  const params = await searchParams;
  const feedUrl = firstSearchParam(params.feed_url);
  if (isValidHttpUrl(feedUrl) !== true) {
    notFound();
  }

  const rawTitle = firstSearchParam(params.title);
  const title = rawTitle === '' ? null : rawTitle.slice(0, ADD_BY_RSS_REMOTE_FEED_TITLE_MAX_LENGTH);

  return <AddByRSSRemoteFeedPageClient feedUrl={feedUrl} title={title} />;
}
