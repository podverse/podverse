/**
 * Configuration types for podverse-external-services
 * These types are used by the app to create the configuration object
 * that gets passed to factory functions
 */

export type FirebaseConfig = {
  notifications_enabled: boolean;
  admin_json_key_path?: string | undefined; // Only required when notifications_enabled is true
};

export type WebConfig = {
  protocol: string;
  host: string;
  icon_image_url?: string | undefined;
};

export type ExternalServicesConfig = {
  firebase: FirebaseConfig;
  web: WebConfig;
};
