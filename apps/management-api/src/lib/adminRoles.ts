import { getParam } from '@management-api/lib/params.js';
import type { ManagementAdminRole } from '@management-api/orm/entities/managementAdminRole.js';
import {
  type CreateManagementAdminRoleData,
  ManagementAdminRoleService,
  type UpdateManagementAdminRoleData,
} from '@management-api/orm/services/managementAdminRole.js';
import {
  createManagementAdminRoleSchema,
  updateManagementAdminRoleSchema,
} from '@management-api/schemas/managementAdminRoles.js';
import type { Request, Response } from 'express';

import {
  getPredefinedManagementAdminRoleById,
  isPredefinedManagementAdminRoleId,
  PREDEFINED_MANAGEMENT_ADMIN_ROLES,
} from '@podverse/helpers';

export type ResolvedManagementAdminPermissions = {
  feeds_crud: number;
  feed_takedown_reasons_crud: number;
  admins_crud: number;
  stats_crud: number;
  billing_prices_crud: number;
  bucket_crud: number;
  embed_demo_crud: number;
};

function predefinedRoleToJson(role: (typeof PREDEFINED_MANAGEMENT_ADMIN_ROLES)[number]) {
  return {
    id: role.id,
    name_key: role.nameKey,
    name: null as string | null,
    is_predefined: true as const,
    feeds_crud: role.feedsCrud,
    feed_takedown_reasons_crud: role.feedTakedownReasonsCrud,
    admins_crud: role.adminsCrud,
    stats_crud: role.statsCrud,
    billing_prices_crud: role.billingPricesCrud,
    bucket_crud: role.bucketCrud,
    embed_demo_crud: role.embedDemoCrud,
    created_at: null as string | null,
  };
}

function customRoleToJson(role: ManagementAdminRole) {
  return {
    id: role.id,
    name_key: null as string | null,
    name: role.name,
    is_predefined: false as const,
    feeds_crud: role.feedsCrud,
    feed_takedown_reasons_crud: role.feedTakedownReasonsCrud,
    admins_crud: role.adminsCrud,
    stats_crud: role.statsCrud,
    billing_prices_crud: role.billingPricesCrud,
    bucket_crud: role.bucketCrud,
    embed_demo_crud: role.embedDemoCrud,
    created_at: role.created_at.toISOString(),
  };
}

export async function resolvePodverseManagementAdminRole(
  roleId: string
): Promise<ResolvedManagementAdminPermissions | null> {
  const predefined = getPredefinedManagementAdminRoleById(roleId);
  if (predefined !== undefined) {
    return {
      feeds_crud: predefined.feedsCrud,
      feed_takedown_reasons_crud: predefined.feedTakedownReasonsCrud,
      admins_crud: predefined.adminsCrud,
      stats_crud: predefined.statsCrud,
      billing_prices_crud: predefined.billingPricesCrud,
      bucket_crud: predefined.bucketCrud,
      embed_demo_crud: predefined.embedDemoCrud,
    };
  }
  const roleService = new ManagementAdminRoleService();
  const custom = await roleService.findById(roleId);
  if (custom === null) {
    return null;
  }
  return {
    feeds_crud: custom.feedsCrud,
    feed_takedown_reasons_crud: custom.feedTakedownReasonsCrud,
    admins_crud: custom.adminsCrud,
    stats_crud: custom.statsCrud,
    billing_prices_crud: custom.billingPricesCrud,
    bucket_crud: custom.bucketCrud,
    embed_demo_crud: custom.embedDemoCrud,
  };
}

export async function handleListManagementAdminRoles(_req: Request, res: Response): Promise<void> {
  const roleService = new ManagementAdminRoleService();
  const customRoles = await roleService.listAll();
  const predefined = PREDEFINED_MANAGEMENT_ADMIN_ROLES.map(predefinedRoleToJson);
  res.status(200).json({ roles: [...predefined, ...customRoles.map(customRoleToJson)] });
}

export async function handleCreateManagementAdminRole(req: Request, res: Response): Promise<void> {
  const { error, value } = createManagementAdminRoleSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }
  const data: CreateManagementAdminRoleData = {
    name: value.name,
    feedsCrud: value.feeds_crud,
    feedTakedownReasonsCrud: value.feed_takedown_reasons_crud,
    adminsCrud: value.admins_crud,
    statsCrud: value.stats_crud,
    billingPricesCrud: value.billing_prices_crud,
    bucketCrud: value.bucket_crud,
    embedDemoCrud: value.embed_demo_crud,
  };
  const roleService = new ManagementAdminRoleService();
  const role = await roleService.create(data);
  res.status(201).json({ role: customRoleToJson(role) });
}

export async function handleUpdateManagementAdminRole(req: Request, res: Response): Promise<void> {
  const roleId = getParam(req, 'roleId');
  if (roleId === undefined || roleId === '') {
    res.status(400).json({ message: 'Role id required' });
    return;
  }
  if (isPredefinedManagementAdminRoleId(roleId)) {
    res.status(404).json({ message: 'Role not found' });
    return;
  }
  const { error, value } = updateManagementAdminRoleSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }
  const roleService = new ManagementAdminRoleService();
  const existing = await roleService.findById(roleId);
  if (existing === null) {
    res.status(404).json({ message: 'Role not found' });
    return;
  }
  const updates: UpdateManagementAdminRoleData = {};
  if (value.name !== undefined) {
    updates.name = value.name;
  }
  if (value.feeds_crud !== undefined) {
    updates.feedsCrud = value.feeds_crud;
  }
  if (value.feed_takedown_reasons_crud !== undefined) {
    updates.feedTakedownReasonsCrud = value.feed_takedown_reasons_crud;
  }
  if (value.admins_crud !== undefined) {
    updates.adminsCrud = value.admins_crud;
  }
  if (value.stats_crud !== undefined) {
    updates.statsCrud = value.stats_crud;
  }
  if (value.billing_prices_crud !== undefined) {
    updates.billingPricesCrud = value.billing_prices_crud;
  }
  if (value.bucket_crud !== undefined) {
    updates.bucketCrud = value.bucket_crud;
  }
  if (value.embed_demo_crud !== undefined) {
    updates.embedDemoCrud = value.embed_demo_crud;
  }
  const updated = await roleService.update(roleId, updates);
  if (updated === null) {
    res.status(404).json({ message: 'Role not found' });
    return;
  }
  res.status(200).json({ role: customRoleToJson(updated) });
}

export async function handleDeleteManagementAdminRole(req: Request, res: Response): Promise<void> {
  const roleId = getParam(req, 'roleId');
  if (roleId === undefined || roleId === '') {
    res.status(400).json({ message: 'Role id required' });
    return;
  }
  if (isPredefinedManagementAdminRoleId(roleId)) {
    res.status(404).json({ message: 'Role not found' });
    return;
  }
  const roleService = new ManagementAdminRoleService();
  const existing = await roleService.findById(roleId);
  if (existing === null) {
    res.status(404).json({ message: 'Role not found' });
    return;
  }
  await roleService.delete(roleId);
  res.status(204).send();
}
