import { type CrudOp, hasCrud } from '@mgmt-api/lib/crud.js';
import type { NextFunction, Request, Response } from 'express';

type PermissionResource =
  | 'feeds'
  | 'feed_takedown_reasons'
  | 'admins'
  | 'stats'
  | 'billing_prices'
  | 'bucket';

function getCrudForResource(
  permissions: NonNullable<Express.User['permissions']>,
  resource: PermissionResource
): number {
  switch (resource) {
    case 'feeds':
      return permissions.feeds_crud;
    case 'feed_takedown_reasons':
      return permissions.feed_takedown_reasons_crud;
    case 'admins':
      return permissions.admins_crud;
    case 'stats':
      return permissions.stats_crud;
    case 'billing_prices':
      return permissions.billing_prices_crud ?? 0;
    case 'bucket':
      return permissions.bucket_crud ?? 0;
  }
}

export function requireCrud(resource: PermissionResource, op: CrudOp) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    if (user.role === 'superuser') {
      next();
      return;
    }
    if (!user.permissions) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    const crud = getCrudForResource(user.permissions, resource);
    if (!hasCrud(crud, op)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export type { PermissionResource };
