import { canReadFeeds, canReadStats } from './managementPermissions';
import type { CurrentUser } from './requests/auth';

export type ManagementNavSection =
  | 'feedFlagStatus'
  | 'stats'
  | 'database'
  | 'admins'
  | 'users'
  | 'workers';

export type ManagementNavRoute = {
  section: ManagementNavSection;
  href: string;
  visible: (user: CurrentUser) => boolean;
};

const isAdminsReadable = (user: CurrentUser): boolean =>
  user.role === 'superuser' || Boolean(user.permissions && user.permissions.admins_crud >= 2);

const isDatabaseReadable = (user: CurrentUser): boolean =>
  user.role === 'superuser' ||
  Boolean(
    user.permissions &&
    (user.permissions.feeds_crud >= 2 ||
      user.permissions.feed_flag_statuses_crud >= 2 ||
      user.permissions.feed_flag_status_reasons_crud >= 2)
  );

const isUsersReadable = (user: CurrentUser): boolean => user.role === 'superuser';

const ROUTES: ManagementNavRoute[] = [
  {
    section: 'feedFlagStatus',
    href: '/feed-operations/flag-status',
    visible: (user) => canReadFeeds(user),
  },
  { section: 'stats', href: '/stats', visible: (user) => canReadStats(user) },
  { section: 'database', href: '/database', visible: (user) => isDatabaseReadable(user) },
  { section: 'admins', href: '/admins', visible: (user) => isAdminsReadable(user) },
  { section: 'users', href: '/users', visible: (user) => isUsersReadable(user) },
  { section: 'workers', href: '/workers', visible: () => true },
];

export function getManagementAppRoutesForUser(user: CurrentUser): ManagementNavRoute[] {
  return ROUTES.filter((r) => r.visible(user));
}

export type DashboardI18nTitleKey =
  | 'feedFlagStatus.title'
  | 'stats.title'
  | 'database.title'
  | 'admins.title'
  | 'users.title'
  | 'workers.title';

export type DashboardI18nDescriptionKey =
  | 'feedFlagStatus.description'
  | 'stats.description'
  | 'database.description'
  | 'admins.description'
  | 'users.description'
  | 'workers.description';

const titleKeys: Record<ManagementNavSection, DashboardI18nTitleKey> = {
  feedFlagStatus: 'feedFlagStatus.title',
  stats: 'stats.title',
  database: 'database.title',
  admins: 'admins.title',
  users: 'users.title',
  workers: 'workers.title',
};

const descriptionKeys: Record<ManagementNavSection, DashboardI18nDescriptionKey> = {
  feedFlagStatus: 'feedFlagStatus.description',
  stats: 'stats.description',
  database: 'database.description',
  admins: 'admins.description',
  users: 'users.description',
  workers: 'workers.description',
};

export function dashboardI18nTitleKey(section: ManagementNavSection): DashboardI18nTitleKey {
  return titleKeys[section];
}

export function dashboardI18nDescriptionKey(
  section: ManagementNavSection
): DashboardI18nDescriptionKey {
  return descriptionKeys[section];
}
