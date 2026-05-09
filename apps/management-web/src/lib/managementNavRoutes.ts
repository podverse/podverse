import { canReadFeeds, canReadStats, canReadStorage } from './managementPermissions';
import type { CurrentUser } from './requests/auth';

export type ManagementNavSection =
  | 'feedFlagStatus'
  | 'stats'
  | 'database'
  | 'products'
  | 'admins'
  | 'users'
  | 'workers'
  | 'storage';

export type ManagementAppNavContext = {
  bucketStorageEnabled: boolean;
};

export type ManagementNavRoute = {
  section: ManagementNavSection;
  href: string;
  visible: (user: CurrentUser, ctx: ManagementAppNavContext) => boolean;
};

const defaultNavContext: ManagementAppNavContext = {
  bucketStorageEnabled: false,
};

const isAdminsReadable = (user: CurrentUser): boolean =>
  user.role === 'superuser' || Boolean(user.permissions && user.permissions.admins_crud >= 2);

const isDatabaseReadable = (user: CurrentUser): boolean =>
  user.role === 'superuser' ||
  Boolean(
    user.permissions &&
    (user.permissions.feeds_crud >= 2 || user.permissions.feed_takedown_reasons_crud >= 2)
  );

const isUsersReadable = (user: CurrentUser): boolean => user.role === 'superuser';

const isProductsReadable = (user: CurrentUser): boolean => user.role === 'superuser';

const ROUTES: ManagementNavRoute[] = [
  {
    section: 'feedFlagStatus',
    href: '/feeds',
    visible: (user) => canReadFeeds(user),
  },
  { section: 'stats', href: '/stats', visible: (user) => canReadStats(user) },
  { section: 'database', href: '/database', visible: (user) => isDatabaseReadable(user) },
  { section: 'products', href: '/products', visible: (user) => isProductsReadable(user) },
  { section: 'admins', href: '/admins', visible: (user) => isAdminsReadable(user) },
  { section: 'users', href: '/users', visible: (user) => isUsersReadable(user) },
  { section: 'workers', href: '/workers', visible: () => true },
  {
    section: 'storage',
    href: '/storage',
    visible: (user, ctx) => canReadStorage(user) && ctx.bucketStorageEnabled,
  },
];

export function getManagementAppRoutesForUser(
  user: CurrentUser,
  ctx: ManagementAppNavContext = defaultNavContext
): ManagementNavRoute[] {
  return ROUTES.filter((r) => r.visible(user, ctx));
}

export type DashboardI18nTitleKey =
  | 'feedFlagStatus.title'
  | 'stats.title'
  | 'database.title'
  | 'products.title'
  | 'admins.title'
  | 'users.title'
  | 'workers.title'
  | 'storage.title';

export type DashboardI18nDescriptionKey =
  | 'feedFlagStatus.description'
  | 'stats.description'
  | 'database.description'
  | 'products.description'
  | 'admins.description'
  | 'users.description'
  | 'workers.description'
  | 'storage.description';

const titleKeys: Record<ManagementNavSection, DashboardI18nTitleKey> = {
  feedFlagStatus: 'feedFlagStatus.title',
  stats: 'stats.title',
  database: 'database.title',
  products: 'products.title',
  admins: 'admins.title',
  users: 'users.title',
  workers: 'workers.title',
  storage: 'storage.title',
};

const descriptionKeys: Record<ManagementNavSection, DashboardI18nDescriptionKey> = {
  feedFlagStatus: 'feedFlagStatus.description',
  stats: 'stats.description',
  database: 'database.description',
  products: 'products.description',
  admins: 'admins.description',
  users: 'users.description',
  workers: 'workers.description',
  storage: 'storage.description',
};

export function dashboardI18nTitleKey(section: ManagementNavSection): DashboardI18nTitleKey {
  return titleKeys[section];
}

export function dashboardI18nDescriptionKey(
  section: ManagementNavSection
): DashboardI18nDescriptionKey {
  return descriptionKeys[section];
}
