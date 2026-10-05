import type { CrudOp } from '@management-api/lib/crud.js';
import { hasCrud } from '@management-api/lib/crud.js';
import type { NextFunction, Request, Response } from 'express';

type PermissionResource =
  | 'feeds'
  | 'feed_takedown_reasons'
  | 'admins'
  | 'stats'
  | 'billing_prices'
  | 'bucket'
  | 'embed_demo'
  | 'notifications'
  | 'billing_channels'
  | 'billing_processor_products'
  | 'billing_account'
  | 'billing_webhook_events';

export function getCrudForResource(
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
    case 'embed_demo':
      return permissions.embed_demo_crud ?? 0;
    case 'notifications':
      return permissions.notifications_crud ?? 0;
    case 'billing_channels':
      return permissions.billing_channels_crud ?? 0;
    case 'billing_processor_products':
      return permissions.billing_processor_products_crud ?? 0;
    case 'billing_account':
      return permissions.billing_account_crud ?? 0;
    case 'billing_webhook_events':
      return permissions.billing_webhook_events_crud ?? 0;
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
