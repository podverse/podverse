import type { AddByRSSRemoteItemRef } from '@podverse/helpers';

/** Fixtures only. A remote item reference the index provider never knows; keeps the not-found path offline. */
export const E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_GUID =
  'e2e0a5f0-0000-4000-8000-0000000000f1';
export const E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_URL =
  'https://e2e-seed-addbyrss.example/remote-not-found.xml';

function normalizedGuid(value: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizedUrl(value: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isE2eRemoteItemNotFoundRef(ref: AddByRSSRemoteItemRef): boolean {
  const guid = normalizedGuid(ref.feed_guid);
  if (guid !== null && guid === E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_GUID) {
    return true;
  }
  const url = normalizedUrl(ref.feed_url);
  return url !== null && url === E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_URL;
}
