import type { ManagementAdminRoleItem } from '../../lib/requests/adminRoles';

export const ADMIN_PERMISSION_RESOURCE_KEYS = [
  'feeds_crud',
  'feed_takedown_reasons_crud',
  'admins_crud',
  'stats_crud',
  'billing_prices_crud',
  'bucket_crud',
  'embed_demo_crud',
  'notifications_crud',
] as const;

export type PermissionState = {
  feeds_crud: number;
  feed_takedown_reasons_crud: number;
  admins_crud: number;
  stats_crud: number;
  billing_prices_crud: number;
  bucket_crud: number;
  embed_demo_crud: number;
  notifications_crud: number;
};

/** User cleared template or edited checkboxes manually — submit explicit permissions only. */
export const CUSTOM_ROLE_SELECTION_ID = '__custom__';

/** Navigate to create role template page. */
export const CREATE_ROLE_NAV_ID = '__create_role__';

export function emptyPermissionState(): PermissionState {
  return {
    feeds_crud: 0,
    feed_takedown_reasons_crud: 0,
    admins_crud: 0,
    stats_crud: 0,
    billing_prices_crud: 0,
    bucket_crud: 0,
    embed_demo_crud: 0,
    notifications_crud: 0,
  };
}

export function permissionStateFromRoleItem(item: ManagementAdminRoleItem): PermissionState {
  return {
    feeds_crud: item.feeds_crud,
    feed_takedown_reasons_crud: item.feed_takedown_reasons_crud,
    admins_crud: item.admins_crud,
    stats_crud: item.stats_crud,
    billing_prices_crud: item.billing_prices_crud,
    bucket_crud: item.bucket_crud,
    embed_demo_crud: item.embed_demo_crud,
    notifications_crud: item.notifications_crud ?? 0,
  };
}

export function permissionStatesEqual(a: PermissionState, b: PermissionState): boolean {
  return ADMIN_PERMISSION_RESOURCE_KEYS.every((key) => a[key] === b[key]);
}

export function rolePermissionScore(item: ManagementAdminRoleItem): number {
  return (
    item.feeds_crud +
    item.feed_takedown_reasons_crud +
    item.admins_crud +
    item.stats_crud +
    item.billing_prices_crud +
    item.bucket_crud +
    item.embed_demo_crud +
    (item.notifications_crud ?? 0)
  );
}

export function findRoleIdMatchingPermissions(
  roles: ManagementAdminRoleItem[],
  permissions: PermissionState
): string | typeof CUSTOM_ROLE_SELECTION_ID {
  const match = roles.find((role) =>
    permissionStatesEqual(permissionStateFromRoleItem(role), permissions)
  );
  return match !== undefined ? match.id : CUSTOM_ROLE_SELECTION_ID;
}
