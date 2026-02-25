import { createRequire } from 'module';

import admin from 'firebase-admin';
import type { ExternalServicesConfig } from './config/types.js';

const require = createRequire(import.meta.url);

export type FirebaseContext = {
  firebaseAdmin: typeof admin | null;
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
  let firebaseAdminInstance: typeof admin | null = null;
  let isFirebaseEnabled = false;

  if (!config.firebase.notifications_enabled) {
    console.warn('Firebase notifications are disabled in the configuration.');
  } else {
    console.warn('Firebase notifications are enabled in the configuration.');

    // Check if the admin JSON key path is provided
    if (!config.firebase.admin_json_key_path || config.firebase.admin_json_key_path.trim() === '') {
      console.error(
        'Firebase Admin Initialization Failed: admin_json_key_path is required when firebase notifications are enabled'
      );
      firebaseAdminInstance = null;
      isFirebaseEnabled = false;
    } else {
      try {
        const settings = require(config.firebase.admin_json_key_path);
        const serviceAccount = settings as admin.ServiceAccount;

        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          console.warn('Firebase Admin Initialized Successfully');
        }

        firebaseAdminInstance = admin;
        isFirebaseEnabled = true;
      } catch (error) {
        console.error('Firebase Admin Initialization Failed:', error);
        firebaseAdminInstance = null;
        isFirebaseEnabled = false;
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

  const getWebIconImageUrl = (): string => {
    return `${getWebBaseUrl()}/${config.web.icon_image_url}`;
  };

  return {
    firebaseAdmin: firebaseAdminInstance,
    isFirebaseEnabled,
    getWebBaseUrl,
    getWebBaseUrlWithPath,
    getWebIconImageUrl,
  };
}
