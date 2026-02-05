import { getMd5Hash } from '@podverse/helpers';

export const getRawFeedMd5Hash = (rawFeed: string): string => {
  const normalizedFeed = rawFeed.trim().replace(/\r\n/g, '\n');
  return getMd5Hash(normalizedFeed);
};
