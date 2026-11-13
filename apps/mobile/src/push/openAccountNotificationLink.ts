import { Linking } from 'react-native';

import { queuePendingDeepLink } from '../navigation/pendingDeepLink';
import { resolveAccountNotificationOpenPath } from './accountNotificationLink';

/**
 * Opens the notification's page through the same pending-deep-link buffer a push tap uses, so a
 * root slide-up card (full player, Search) is dismissed with `pop: true`. An http(s) path, or any
 * path that already contains a scheme, is opened with Linking. A failure is logged and resolved;
 * this does not throw.
 */
export async function openAccountNotificationLink(notification: {
  link_path: string | null;
  payload: Record<string, unknown> | null;
}): Promise<void> {
  let targetPath = '';
  try {
    targetPath = resolveAccountNotificationOpenPath(notification);
    const prefixedLink = targetPath.startsWith('http://') || targetPath.startsWith('https://');
    if (prefixedLink || targetPath.includes('://')) {
      await Linking.openURL(targetPath);
      return;
    }

    queuePendingDeepLink(targetPath.startsWith('/') ? targetPath : `/${targetPath}`);
  } catch (error: unknown) {
    console.warn('Could not navigate from notification link', targetPath, error);
  }
}
