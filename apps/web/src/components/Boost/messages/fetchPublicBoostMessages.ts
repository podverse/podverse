import type { PublicBoostMessagesPage } from '@podverse/v4v-metaboost';
import { fetchMbrssV1PublicMessages, fetchMbV1PublicMessages } from '@podverse/v4v-metaboost';

import type { BoostMessagesPageFetcher } from './types';

type MbrssV1MessagesSource = {
  type: 'mbrss-v1';
  publicMessagesUrl: string;
  scope:
    | { type: 'bucket' }
    | { type: 'channel'; podcastGuid: string }
    | { type: 'item'; itemGuid: string }
    | { type: 'artist'; podcastGuid: string }
    | { type: 'album'; podcastGuid: string }
    | { type: 'track'; itemGuid: string }
    | { type: 'livestream'; itemGuid: string };
};

type MbV1MessagesSource = {
  type: 'mb-v1';
  publicMessagesUrl: string;
};

export type BoostMessagesSource = MbrssV1MessagesSource | MbV1MessagesSource;

const toMbrssApiScope = (scope: MbrssV1MessagesSource['scope']) => {
  if (scope.type === 'artist' || scope.type === 'album') {
    return { type: 'channel' as const, podcastGuid: scope.podcastGuid };
  }
  if (scope.type === 'track' || scope.type === 'livestream') {
    return { type: 'item' as const, itemGuid: scope.itemGuid };
  }
  return scope;
};

const normalizeMessagesPage = (data: PublicBoostMessagesPage): PublicBoostMessagesPage => ({
  messages: data.messages,
  page: data.page,
  limit: data.limit,
  total: data.total,
  totalPages: data.totalPages,
});

export const createBoostMessagesPageFetcher = (
  source: BoostMessagesSource,
  defaultLimit = 20
): BoostMessagesPageFetcher => {
  return async ({ page, limit }) => {
    const requestedLimit = limit > 0 ? limit : defaultLimit;
    if (source.type === 'mb-v1') {
      return normalizeMessagesPage(
        await fetchMbV1PublicMessages(source.publicMessagesUrl, {
          page,
          limit: requestedLimit,
        })
      );
    }
    const apiScope = toMbrssApiScope(source.scope);
    return normalizeMessagesPage(
      await fetchMbrssV1PublicMessages(source.publicMessagesUrl, apiScope, {
        page,
        limit: requestedLimit,
      })
    );
  };
};
