import {
  MOBILE_HOME_TAB_PATH,
  resolveNotificationDestinationFromPayload,
} from '@podverse/helpers';

export const HOME_FALLBACK_PATH = MOBILE_HOME_TAB_PATH;

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Extract a routable path from a notification data payload. Prefers a Home-stack path
 * (`/home/podcast/:channel/episode/:item`) when the payload names a channel and item.
 */
export const extractNotificationTargetPath = (
  data: Record<string, unknown> | null | undefined
): string | null => {
  if (data === null || data === undefined) {
    return null;
  }

  const explicitUrl = asNonEmptyString(data.url);
  if (explicitUrl !== null) {
    return explicitUrl;
  }

  const destination = resolveNotificationDestinationFromPayload(data);
  if (destination.kind === 'home') {
    return null;
  }
  return destination.mobileStackPath ?? destination.webPath;
};
