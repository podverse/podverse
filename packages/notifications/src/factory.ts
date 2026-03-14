import webpush from 'web-push';

import type { NotificationsConfig } from './config/types.js';

export type NotificationsContext = {
  config: NotificationsConfig;
  webpushAdmin: typeof webpush | null;
  isWebPushEnabled: boolean;
  getWebBaseUrl: () => string;
  getWebBaseUrlWithPath: (path: string) => string;
  getWebIconImageUrl: () => string;
};

/**
 * Creates a notifications context with the provided configuration.
 * This is the factory function that should be called from the app level.
 *
 * @param config - The notifications configuration (from app-level env vars)
 * @returns NotificationsContext with initialized services and helper functions
 */
export function createNotificationsContext(config: NotificationsConfig): NotificationsContext {
  let webpushAdmin: typeof webpush | null = null;
  let isWebPushEnabled = false;

  if (!config.webpush.enabled) {
    console.warn('Web Push notifications are disabled in the configuration.');
  } else {
    // Check if the VAPID keys are provided
    if (
      !config.webpush.vapid_public_key ||
      config.webpush.vapid_public_key.trim() === '' ||
      !config.webpush.vapid_private_key ||
      config.webpush.vapid_private_key.trim() === '' ||
      !config.webpush.vapid_subject ||
      config.webpush.vapid_subject.trim() === ''
    ) {
      console.error(
        'Web Push Admin Initialization Failed: vapid_public_key, vapid_private_key, and vapid_subject are required when webpush is enabled'
      );
      webpushAdmin = null;
      isWebPushEnabled = false;
    } else {
      console.warn('Web Push notifications are enabled in the configuration.');

      try {
        // Safe to use these values directly - we've validated they exist above
        const vapidSubject = config.webpush.vapid_subject;
        const vapidPublicKey = config.webpush.vapid_public_key;
        const vapidPrivateKey = config.webpush.vapid_private_key;
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
        webpushAdmin = webpush;
        isWebPushEnabled = true;
        console.warn('Web Push Admin Initialized Successfully');
      } catch (error) {
        console.error('Web Push Admin Initialization Failed:', error);
        webpushAdmin = null;
        isWebPushEnabled = false;
      }
    }
  }

  // Helper functions bound to config
  const getWebBaseUrl = (): string => {
    return `${config.web.protocol}://${config.web.host}`;
  };

  const getWebBaseUrlWithPath = (path: string): string => {
    const base = getWebBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  };

  const getWebIconImageUrl = (): string => {
    return `${getWebBaseUrl()}${config.web.icon_image_path}`;
  };

  return {
    config,
    webpushAdmin,
    isWebPushEnabled,
    getWebBaseUrl,
    getWebBaseUrlWithPath,
    getWebIconImageUrl,
  };
}
