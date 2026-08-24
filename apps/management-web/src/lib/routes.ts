import { encodeStorageObjectKeyForPathSegment } from './storageObjectPath';

/** Canonical management-web app paths (not main-app deep links — use `APP_ROUTES` from `@podverse/helpers` for those). */
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  FEEDS: '/feeds',
  FEEDS_FLAG_STATUS: '/feeds/flag-status',
  STATS: '/stats',
  DATABASE: '/database',
  PRODUCTS: '/products',
  PRODUCTS_MEMBERSHIPS: '/products/memberships',
  WEB: '/web',
  WEB_EMBED_DEMO: '/web/embed-demo',
  NOTIFICATIONS: '/notifications',
  NOTIFICATIONS_NEW: '/notifications/new',
  ADMINS: '/admins',
  ADMINS_NEW: '/admins/new',
  ADMINS_ROLES_NEW: '/admins/roles/new',
  ADMINS_REDEEM_INVITE_LINK: '/admins/redeem-invite-link',
  USERS: '/users',
  USERS_NEW: '/users/new',
  WORKERS: '/workers',
  STORAGE: '/storage',
  SETTINGS: '/settings',
} as const;

export type ManagementRoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export const buildAdminPath = (adminId: number | string): string => `${ROUTES.ADMINS}/${adminId}`;

export const buildAdminEditPath = (adminId: number | string): string =>
  `${ROUTES.ADMINS}/${adminId}/edit`;

export const buildAdminRoleNewPath = (returnUrl: string): string =>
  `${ROUTES.ADMINS_ROLES_NEW}?returnUrl=${encodeURIComponent(returnUrl)}`;

export const buildUserPath = (userId: number | string): string => `${ROUTES.USERS}/${userId}`;

export type UserEditTab = 'profile' | 'password';

export const buildUserEditPath = (userId: number | string, tab?: UserEditTab): string => {
  const base = `${ROUTES.USERS}/${userId}/edit`;
  return tab === undefined ? base : `${base}?tab=${tab}`;
};

export const buildNotificationCampaignPath = (idText: string): string =>
  `${ROUTES.NOTIFICATIONS}/${idText}`;

export const buildDatabaseTablePath = (tableName: string): string =>
  `${ROUTES.DATABASE}/${tableName}`;

export const buildDatabaseTableNewPath = (tableName: string): string =>
  `${ROUTES.DATABASE}/${tableName}/new`;

export const buildDatabaseRowPath = (tableName: string, rowId: string | number): string =>
  `${ROUTES.DATABASE}/${tableName}/${String(rowId)}`;

export const buildStorageObjectPath = (key: string): string =>
  `${ROUTES.STORAGE}/${encodeStorageObjectKeyForPathSegment(key)}`;

export const buildFeedDatabaseRowPath = (feedId: number | string): string =>
  buildDatabaseRowPath('feed', feedId);
