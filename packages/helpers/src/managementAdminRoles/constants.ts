/**
 * Predefined Podverse management-admin roles (templates). Custom roles are stored in
 * `management_admin_role` (management DB).
 * CRUD bits: create=1, read=2, update=4, delete=8 (sum 0–15).
 */
export const PREDEFINED_MANAGEMENT_ADMIN_ROLE_IDS = [
  'everything',
  'read_everything',
  'feeds_moderation',
  'admins_stats_read',
  'storage_full',
] as const;

export type PredefinedManagementAdminRoleId = (typeof PREDEFINED_MANAGEMENT_ADMIN_ROLE_IDS)[number];

export type PredefinedManagementAdminRole = {
  id: PredefinedManagementAdminRoleId;
  nameKey: string;
  feedsCrud: number;
  feedTakedownReasonsCrud: number;
  adminsCrud: number;
  statsCrud: number;
  billingPricesCrud: number;
  bucketCrud: number;
  embedDemoCrud: number;
};

export const PREDEFINED_MANAGEMENT_ADMIN_ROLES: PredefinedManagementAdminRole[] = [
  {
    id: 'everything',
    nameKey: 'managementAdminRoles.everything',
    feedsCrud: 15,
    feedTakedownReasonsCrud: 15,
    adminsCrud: 15,
    statsCrud: 15,
    billingPricesCrud: 15,
    bucketCrud: 15,
    embedDemoCrud: 15,
  },
  {
    id: 'read_everything',
    nameKey: 'managementAdminRoles.readEverything',
    feedsCrud: 2,
    feedTakedownReasonsCrud: 2,
    adminsCrud: 2,
    statsCrud: 2,
    billingPricesCrud: 2,
    bucketCrud: 2,
    embedDemoCrud: 2,
  },
  {
    id: 'feeds_moderation',
    nameKey: 'managementAdminRoles.feedsModeration',
    feedsCrud: 15,
    feedTakedownReasonsCrud: 15,
    adminsCrud: 0,
    statsCrud: 0,
    billingPricesCrud: 0,
    bucketCrud: 0,
    embedDemoCrud: 0,
  },
  {
    id: 'admins_stats_read',
    nameKey: 'managementAdminRoles.adminsStatsRead',
    feedsCrud: 2,
    feedTakedownReasonsCrud: 2,
    adminsCrud: 15,
    statsCrud: 15,
    billingPricesCrud: 2,
    bucketCrud: 2,
    embedDemoCrud: 2,
  },
  {
    id: 'storage_full',
    nameKey: 'managementAdminRoles.storageFull',
    feedsCrud: 0,
    feedTakedownReasonsCrud: 0,
    adminsCrud: 0,
    statsCrud: 0,
    billingPricesCrud: 0,
    bucketCrud: 15,
    embedDemoCrud: 0,
  },
];

export function getPredefinedManagementAdminRoleById(
  id: string
): PredefinedManagementAdminRole | undefined {
  return PREDEFINED_MANAGEMENT_ADMIN_ROLES.find((role) => role.id === id);
}

export function isPredefinedManagementAdminRoleId(id: string): boolean {
  return getPredefinedManagementAdminRoleById(id) !== undefined;
}
