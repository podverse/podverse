'use client';

import { useEffect, useState } from 'react';

import type { DTOChannel, QueryParamsMedium } from '@podverse/helpers';
import { PAGINATION } from '@podverse/helpers';
import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
} from '@podverse/helpers-requests';

import { useAccount } from '../contexts/Account';
import { getApiRequestService } from '../factories/apiRequestService';

/**
 * How much of a subscription list one filter pass will read before it stops asking.
 *
 * The same bound the rest of the app uses for "the most rows we will enumerate in one go". Beyond it
 * the walk stops and filtering answers from what it has, which is preferable to a page that fires
 * dozens of requests because one account follows an extraordinary number of shows.
 */
const MAX_CHANNELS = PAGINATION.MAX_COUNT;

const MAX_PAGES = Math.ceil(MAX_CHANNELS / PAGINATION.DEFAULT_LIMIT);

const EMPTY_CHANNELS: readonly DTOChannel[] = [];

export interface FullSubscribedChannelsParams {
  medium: QueryParamsMedium;
  range: QueryParamsStatsRange | null;
  sort: QueryParamsSubscribedFullSort;
}

export interface FullSubscribedChannels {
  channels: readonly DTOChannel[];
  isLoading: boolean;
  /** True once a list is in hand, so an empty filter result can be trusted rather than guessed at. */
  isReady: boolean;
}

/**
 * Pages are requested one after another rather than at once. The first page covers most accounts on
 * its own, and a burst of parallel requests would cost the server far more than it saves a user who
 * is about to type another character anyway.
 */
const readAllPages = async (params: FullSubscribedChannelsParams): Promise<DTOChannel[]> => {
  const api = getApiRequestService();
  const channels: DTOChannel[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await api.reqChannelGetMany({
      page,
      medium: params.medium,
      type: 'subscribed',
      sort: params.sort,
      range: params.range,
      category: null,
    });

    channels.push(...response.data);

    if (response.data.length < response.meta.limit || channels.length >= MAX_CHANNELS) {
      break;
    }
  }

  return channels;
};

const buildCacheKey = (params: FullSubscribedChannelsParams, accountKey: string): string => {
  return [params.sort, params.range ?? '', params.medium, accountKey].join('|');
};

/**
 * The account's whole subscribed channel list, in the order the server would paginate it.
 *
 * `/podcasts` pages server-side, so filtering only what is on screen would narrow page 3 of 5 and
 * report nothing found while the match sat on page 1. Reading the list end to end is what lets the
 * filter answer for the whole subscription list, and holding server order means a filtered list
 * still reads in the order the user chose to sort by.
 *
 * Fetched lazily — nothing is read until a filter is actually in use, so the ordinary visit that
 * never touches the input pays nothing for it. The result is kept until the sort, range, or account
 * changes, so clearing a term and typing another does not fetch again.
 *
 * A failure settles as an empty list, so the filter reports finding nothing and the user can recover
 * by clearing the term or changing sort. A spinner that never resolves would be the worse failure.
 */
export function useFullSubscribedChannels(
  enabled: boolean,
  params: FullSubscribedChannelsParams
): FullSubscribedChannels {
  const { loggedInAccount } = useAccount();
  const [cache, setCache] = useState<{ key: string; channels: readonly DTOChannel[] } | null>(null);

  const isActive = enabled && !!loggedInAccount;
  const cacheKey = buildCacheKey(params, loggedInAccount ? 'account' : 'anonymous');
  const isCached = cache?.key === cacheKey;

  useEffect(() => {
    if (!isActive || isCached) {
      return;
    }

    let cancelled = false;

    (async () => {
      let channels: readonly DTOChannel[] = EMPTY_CHANNELS;
      try {
        channels = await readAllPages(params);
      } catch {
        channels = EMPTY_CHANNELS;
      }

      if (!cancelled) {
        setCache({ key: cacheKey, channels });
      }
    })();

    return () => {
      cancelled = true;
    };
    // `params` is rebuilt on every render; `cacheKey` is the value that decides whether it changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, isActive, isCached]);

  return {
    channels: isCached ? cache.channels : EMPTY_CHANNELS,
    isLoading: isActive && !isCached,
    isReady: isCached,
  };
}
