// Config types for app-level configuration
export * from './config/index.js';

// Factory function to create the notifications context
export { createNotificationsContext } from './factory.js';
export type { NotificationsContext } from './factory.js';

// Service exports
export * from './services/notifications/index.js';
export * from './services/webpush/index.js';
export * from './services/unifiedpush/index.js';
