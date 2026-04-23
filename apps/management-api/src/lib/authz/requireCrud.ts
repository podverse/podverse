import { type CrudOp, hasCrud } from '@mgmt-api/lib/crud.js';
import type { NextFunction, Request, Response } from 'express';

type PermissionResource =
  | 'feeds'
  | 'feed_flag_statuses'
  | 'feed_flag_status_reasons'
  | 'admins'
  | 'stats';

function getCrudForResource(
  permissions: NonNullable<Express.User['permissions']>,
  resource: PermissionResource
): number {
  switch (resource) {
    case 'feeds':
      return permissions.feeds_crud;
    case 'feed_flag_statuses':
      return permissions.feed_flag_statuses_crud;
    case 'feed_flag_status_reasons':
      return permissions.feed_flag_status_reasons_crud;
    case 'admins':
      return permissions.admins_crud;
    case 'stats':
      return permissions.stats_crud;
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
