import type { CurrentUser } from './requests/auth';

const CRUD_READ = 2;
const CRUD_UPDATE = 4;

export function canReadFeeds(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  return (
    user.permissions !== null &&
    user.permissions !== undefined &&
    (user.permissions.feeds_crud & CRUD_READ) !== 0
  );
}

export function canUpdateFeeds(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  return (
    user.permissions !== null &&
    user.permissions !== undefined &&
    (user.permissions.feeds_crud & CRUD_UPDATE) !== 0
  );
}

export function canReadStats(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  return (
    user.permissions !== null &&
    user.permissions !== undefined &&
    (user.permissions.stats_crud & CRUD_READ) !== 0
  );
}

/** Matches management-api `FEED_FLAG_STATUS_TAKEDOWN_ID`. */
export const FEED_FLAG_TAKEDOWN_ID = 6;
export const FEED_FLAG_SPAM_ID = 3;

export function statusRequiresConfirm(statusId: number): boolean {
  return statusId === FEED_FLAG_SPAM_ID || statusId === FEED_FLAG_TAKEDOWN_ID;
}
