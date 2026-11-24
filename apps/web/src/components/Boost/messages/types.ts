import type { PublicBoostMessage } from '@podverse/v4v-metaboost';

export type BoostBreadcrumbLinkResolver = (
  message: PublicBoostMessage
) => Promise<string | null> | string | null;
