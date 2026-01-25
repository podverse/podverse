/**
 * Configuration types for podverse-notifications
 * These types are used by the app to create the configuration object
 * that gets passed to createNotificationsContext()
 */

export type WebPushConfig = {
  enabled: boolean;
  vapid_public_key?: string | undefined; // Only required when enabled is true
  vapid_private_key?: string | undefined; // Only required when enabled is true
  vapid_subject?: string | undefined; // Only required when enabled is true
};

export type WebConfig = {
  protocol: string;
  host: string;
  icon_image_path?: string | undefined;
};

export type NotificationsConfig = {
  brandName: string;
  web: WebConfig;
  webpush: WebPushConfig;
};
