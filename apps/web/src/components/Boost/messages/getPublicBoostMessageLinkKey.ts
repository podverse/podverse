import type { PublicBoostMessage } from '@podverse/v4v-metaboost';

export const getPublicBoostMessageLinkKey = (message: PublicBoostMessage): string =>
  message.messageGuid || message.id;
