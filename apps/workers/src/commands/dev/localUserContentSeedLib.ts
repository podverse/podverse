/**
 * Emails created by infra/development/seeds/local-dev-accounts.sql.
 * dummyNN@podverse.local stays off e2e-* / *-test@example.com / embed `demo`.
 */
export const LOCAL_USER_CONTENT_SEED_EMAILS = [
  'local-trial@example.com',
  'local-premium@example.com',
  'dummy01@podverse.local',
  'dummy02@podverse.local',
  'dummy03@podverse.local',
  'dummy04@podverse.local',
  'dummy05@podverse.local',
  'dummy06@podverse.local',
] as const;

export const DUMMY_CLIP_TITLE_PREFIX = 'Dummy clip ';
export const DUMMY_AV_PLAYLIST_TITLE = 'Dummy AV mix';
export const DUMMY_MUSIC_PLAYLIST_TITLE = 'Dummy music mix';

export const FOLLOWS_AV_COUNT = 12;
export const FOLLOWS_MUSIC_COUNT = 3;
export const CLIPS_PER_ACCOUNT = 6;
export const PLAYLIST_ITEM_COUNT = 5;
export const ITEMS_PER_CHANNEL = 3;

export function pickRotated<T>(items: readonly T[], seed: number, count: number): T[] {
  if (items.length === 0 || count <= 0) {
    return [];
  }
  const take = Math.min(count, items.length);
  const start = ((seed % items.length) + items.length) % items.length;
  const picked: T[] = [];
  for (let index = 0; index < take; index += 1) {
    const item = items[(start + index) % items.length];
    if (item !== undefined) {
      picked.push(item);
    }
  }
  return picked;
}

export function dummyClipTitle(itemIdText: string): string {
  return `${DUMMY_CLIP_TITLE_PREFIX}${itemIdText}`;
}

/** 15–30s window that starts in the first minute and ends by 90s. */
export function dummyClipWindow(accountId: number, itemId: number): { end: number; start: number } {
  const mixed = (accountId * 1009 + itemId * 17) >>> 0;
  const duration = 15 + (mixed % 16);
  const start = 5 + (mixed % 56);
  const end = Math.min(90, start + duration);
  return {
    end,
    start: Math.min(start, end - 15),
  };
}
