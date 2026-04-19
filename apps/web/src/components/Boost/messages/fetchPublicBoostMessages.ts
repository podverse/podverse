import type { MetaBoost, PublicBoostMessagesPage } from '@podverse/v4v-metaboost';
import { fetchMbrssV1PublicMessages, fetchMbV1PublicMessages } from '@podverse/v4v-metaboost';

import type { BoostMessagesPageFetcher } from './types';

type MbrssV1MessagesSource = {
  type: 'mbrss-v1';
  metaBoost: MetaBoost;
  scope:
    | { type: 'bucket' }
    | { type: 'channel'; podcastGuid: string }
    | { type: 'item'; itemGuid: string };
};

type MbV1MessagesSource = {
  type: 'mb-v1';
  metaBoost: MetaBoost;
};

export type BoostMessagesSource = MbrssV1MessagesSource | MbV1MessagesSource;

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
        await fetchMbV1PublicMessages(source.metaBoost.node, {
          page,
          limit: requestedLimit,
        })
      );
    }
    return normalizeMessagesPage(
      await fetchMbrssV1PublicMessages(source.metaBoost.node, source.scope, {
        page,
        limit: requestedLimit,
      })
    );
  };
};
