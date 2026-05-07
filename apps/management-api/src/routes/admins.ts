import { config } from '@mgmt-api/config/index.js';
import { ensureAuthenticated } from '@mgmt-api/lib/auth/index.js';
import { requireCrud } from '@mgmt-api/lib/authz/requireCrud.js';
import { requireSuperuser } from '@mgmt-api/lib/authz/requireSuperuser.js';
import { hasCrud } from '@mgmt-api/lib/crud.js';
import { getParamRequired } from '@mgmt-api/lib/params.js';
import { AdminAccountService } from '@mgmt-api/orm/services/adminAccount.js';
import express from 'express';
import Joi from 'joi';

const router = express.Router();
const baseUrl = `${config.api.prefix}${config.api.version}`;

const crudSchema = Joi.number().integer().min(0).max(15);

const createAdminSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  permissions: Joi.object({
    feeds_crud: crudSchema,
    feed_takedown_reasons_crud: crudSchema,
    admins_crud: crudSchema,
    stats_crud: crudSchema,
    billing_prices_crud: crudSchema,
    bucket_crud: crudSchema,
  }).optional(),
}).required();

const updateAdminSchema = Joi.object({
  email: Joi.string().email(),
  password: Joi.string().min(8),
  permissions: Joi.object({
    feeds_crud: crudSchema,
    feed_takedown_reasons_crud: crudSchema,
    admins_crud: crudSchema,
    stats_crud: crudSchema,
    billing_prices_crud: crudSchema,
    bucket_crud: crudSchema,
  }),
})
  .min(1)
  .required();

function adminAccountToJson(admin: {
  id: number;
  id_text: string;
  admin_account_role_id: number;
  admin_account_role: { role: string };
  admin_account_credentials?: { email: string } | null;
  permissions?: {
    feedsCrud: number;
    feedTakedownReasonsCrud: number;
    adminsCrud: number;
    statsCrud: number;
    billingPricesCrud: number;
    bucketCrud: number;
  } | null;
  created_at: Date;
}) {
  return {
    id: admin.id,
    id_text: admin.id_text,
    role: admin.admin_account_role.role,
    email: admin.admin_account_credentials?.email ?? null,
    permissions: admin.permissions
      ? {
          feeds_crud: admin.permissions.feedsCrud,
          feed_takedown_reasons_crud: admin.permissions.feedTakedownReasonsCrud,
          admins_crud: admin.permissions.adminsCrud,
          stats_crud: admin.permissions.statsCrud,
          billing_prices_crud: admin.permissions.billingPricesCrud,
          bucket_crud: admin.permissions.bucketCrud,
        }
      : null,
    created_at: admin.created_at,
  };
}

// List all admin accounts
router.get(
  `${baseUrl}/admins`,
  ensureAuthenticated,
  requireCrud('admins', 'read'),
  async (_req, res, next) => {
    try {
      const service = new AdminAccountService();
      const admins = await service.list();
      res.json(admins.map(adminAccountToJson));
    } catch (error) {
      next(error);
    }
  }
);

// Get admin account by id
router.get(
  `${baseUrl}/admins/:id`,
  ensureAuthenticated,
  requireCrud('admins', 'read'),
  async (req, res, next) => {
    try {
      const service = new AdminAccountService();
      const idParam = getParamRequired(req, 'id');
      const id = parseInt(idParam, 10);

      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid id' });
        return;
      }

      const admin = await service.getWithRoleAndPermissions(id);
      if (!admin) {
        res.status(404).json({ message: 'Admin account not found' });
        return;
      }

      res.json(adminAccountToJson(admin));
    } catch (error) {
      next(error);
    }
  }
);

// Create admin account
router.post(`${baseUrl}/admins`, ensureAuthenticated, requireSuperuser, async (req, res, next) => {
  try {
    const { error, value } = createAdminSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.message });
      return;
    }

    const service = new AdminAccountService();
    const admin = await service.create(value);
    res.status(201).json(adminAccountToJson(admin));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Admin account with this email already exists'
    ) {
      res.status(409).json({ message: error.message });
      return;
    }
    next(error);
  }
});

// Update admin account (including permissions)
router.patch(`${baseUrl}/admins/:id`, ensureAuthenticated, async (req, res, next) => {
  try {
    const actor = req.user;
    if (!actor) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const idParam = getParamRequired(req, 'id');
    const targetId = parseInt(idParam, 10);
    if (isNaN(targetId)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const { error, value } = updateAdminSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.message });
      return;
    }

    // Self-permission guard: admin cannot change their own CRUD permissions
    const isSelfUpdate = actor.id === targetId;
    const isSuperuser = actor.role === 'superuser';

    if (value.permissions !== undefined && isSelfUpdate && !isSuperuser) {
      res.status(403).json({ message: 'Cannot change your own permissions' });
      return;
    }

    // Superuser cannot change their own permissions either
    if (value.permissions !== undefined && isSelfUpdate && isSuperuser) {
      res.status(403).json({ message: 'Cannot change your own permissions' });
      return;
    }

    // Non-superuser actors need admins:create or admins:update to modify permissions
    if (value.permissions !== undefined && !isSuperuser) {
      const adminsCrud = actor.permissions?.admins_crud ?? 0;
      const canChangePermissions = hasCrud(adminsCrud, 'create') || hasCrud(adminsCrud, 'update');
      if (!canChangePermissions) {
        res.status(403).json({
          message: 'Create or update permission on admins required to change permissions',
        });
        return;
      }
    }

    // Non-superuser cannot update superuser accounts
    const service = new AdminAccountService();
    const target = await service.getWithRoleAndPermissions(targetId);
    if (!target) {
      res.status(404).json({ message: 'Admin account not found' });
      return;
    }
    if (target.admin_account_role.role === 'superuser' && !isSuperuser) {
      res.status(404).json({ message: 'Admin account not found' });
      return;
    }

    const updated = await service.update(targetId, value);
    res.json(adminAccountToJson(updated));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Superuser accounts cannot be modified via API'
    ) {
      res.status(403).json({ message: error.message });
      return;
    }
    next(error);
  }
});

// Delete admin account
router.delete(
  `${baseUrl}/admins/:id`,
  ensureAuthenticated,
  requireSuperuser,
  async (req, res, next) => {
    try {
      const actor = req.user;
      const idParam = getParamRequired(req, 'id');
      const targetId = parseInt(idParam, 10);
      if (isNaN(targetId)) {
        res.status(400).json({ message: 'Invalid id' });
        return;
      }

      // Superuser cannot delete themselves
      if (actor && actor.id === targetId) {
        res.status(403).json({ message: 'Cannot delete your own account' });
        return;
      }

      const service = new AdminAccountService();
      await service.delete(targetId);
      res.json({ message: 'Admin account deleted' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Admin account not found') {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof Error && error.message === 'Superuser accounts cannot be deleted') {
        res.status(403).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
);

export const adminsRouter = router;
