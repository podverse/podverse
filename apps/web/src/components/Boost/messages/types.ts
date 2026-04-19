import type { PublicBoostMessage, PublicBoostMessagesPage } from '@podverse/v4v-metaboost';

export type BoostMessagesPageFetcher = (params: {
  page: number;
  limit: number;
}) => Promise<PublicBoostMessagesPage>;

export type BoostBreadcrumbLinkResolver = (
  message: PublicBoostMessage
) => Promise<string | null> | string | null;
