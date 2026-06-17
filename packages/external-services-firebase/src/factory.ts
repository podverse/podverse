import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { Messaging } from 'firebase-admin/messaging';
import { existsSync } from 'fs';

import type { ExternalServicesConfig } from './config/types.js';

export type FirebaseContext = {
  firebaseMessaging: Messaging | null;
  isFirebaseEnabled: boolean;
  getWebBaseUrl: () => string;
  getWebBaseUrlWithPath: (path: string) => string;
  getWebIconImageUrl: () => string;
};

/**
 * Creates a Firebase context with the provided configuration.
 * This is the factory function that should be called from the app level.
 *
 * @param config - The external services configuration (from app-level env vars)
 * @returns FirebaseContext with initialized Firebase admin and helper functions
 */
export function createFirebaseContext(config: ExternalServicesConfig): FirebaseContext {
  let firebaseMessagingInstance: Messaging | null = null;
  let isFirebaseEnabled = false;
  const shouldLogConfigNotice =
    process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug';

  if (!config.firebase.notifications_enabled) {
    if (shouldLogConfigNotice) {
      console.warn('Firebase notifications are disabled in the configuration.');
    }
  } else {
    if (shouldLogConfigNotice) {
      console.warn('Firebase notifications are enabled in the configuration.');
    }

    // Check if the admin JSON key path is provided
    if (!config.firebase.admin_json_key_path || config.firebase.admin_json_key_path.trim() === '') {
      console.error(
        'Firebase Admin Initialization Failed: admin_json_key_path is required when firebase notifications are enabled'
      );
      firebaseMessagingInstance = null;
      isFirebaseEnabled = false;
    } else {
      const adminJsonPath = config.firebase.admin_json_key_path.trim();
      if (!existsSync(adminJsonPath)) {
        console.error(
          'Firebase Admin Initialization Failed: admin JSON key file not found at',
          adminJsonPath
        );
        firebaseMessagingInstance = null;
        isFirebaseEnabled = false;
      } else {
        try {
          if (getApps().length === 0) {
            initializeApp({
              credential: cert(adminJsonPath),
            });
            console.warn('Firebase Admin Initialized Successfully');
          }

          firebaseMessagingInstance = getMessaging();
          isFirebaseEnabled = true;
        } catch (error) {
          console.error('Firebase Admin Initialization Failed:', error);
          firebaseMessagingInstance = null;
          isFirebaseEnabled = false;
        }
      }
    }
  }

  // Helper functions bound to config
  const getWebBaseUrl = (): string => {
    return `${config.web.protocol}://${config.web.host}`;
  };

  const getWebBaseUrlWithPath = (path: string): string => {
    const baseUrl = getWebBaseUrl();
    return `${baseUrl}${path}`;
  };

  const getWebIconImageUrl = (): string => (config.web.icon_image_url ?? '').trim();

  return {
    firebaseMessaging: firebaseMessagingInstance,
    isFirebaseEnabled,
    getWebBaseUrl,
    getWebBaseUrlWithPath,
    getWebIconImageUrl,
  };
}
