import { getMd5Hash, normalizeRawFeedForHash } from '@podverse/helpers';

export const getRawFeedMd5Hash = (rawFeed: string): string =>
  getMd5Hash(normalizeRawFeedForHash(rawFeed));
