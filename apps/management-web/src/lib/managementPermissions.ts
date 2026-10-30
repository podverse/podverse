import type { CrudAction } from '@podverse/helpers';
import { crudMaskHas } from '@podverse/helpers';

import type { CurrentUser } from './requests/auth';

function userHasCrud(user: CurrentUser, mask: number | undefined, action: CrudAction): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  return (
    user.permissions !== null && user.permissions !== undefined && crudMaskHas(mask ?? 0, action)
  );
}

export function canReadAdmins(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.admins_crud, 'read');
}

export function canCreateAdmins(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.admins_crud, 'create');
}

export function canUpdateAdmins(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.admins_crud, 'update');
}

export function canDeleteAdmins(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.admins_crud, 'delete');
}

export function canReadFeeds(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.feeds_crud, 'read');
}

export function canCreateFeeds(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.feeds_crud, 'create');
}

export function canUpdateFeeds(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.feeds_crud, 'update');
}

export function canDeleteFeeds(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.feeds_crud, 'delete');
}

export function canReadStats(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.stats_crud, 'read');
}

export function canUpdateStats(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.stats_crud, 'update');
}

export function canReadStorage(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.bucket_crud, 'read');
}

export function canDeleteStorage(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.bucket_crud, 'delete');
}

export function canReadEmbedDemo(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.embed_demo_crud, 'read');
}

export function canUpdateEmbedDemo(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.embed_demo_crud, 'update');
}

export function canReadNotifications(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.notifications_crud, 'read');
}

export function canCreateNotifications(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.notifications_crud, 'create');
}

export function canReadBillingChannels(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.billing_channels_crud, 'read');
}

export function canUpdateBillingChannels(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.billing_channels_crud, 'update');
}

export function canReadBillingProcessorProducts(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.billing_processor_products_crud, 'read');
}

export function canCreateBillingProcessorProducts(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.billing_processor_products_crud, 'create');
}

export function canUpdateBillingProcessorProducts(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.billing_processor_products_crud, 'update');
}

export function canReadBillingAccount(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.billing_account_crud, 'read');
}

export function canResyncBillingAccount(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.billing_account_crud, 'update');
}

export function canGrantBillingMembership(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.billing_account_crud, 'create');
}

export function canEndBillingMembership(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.billing_account_crud, 'delete');
}

export function canReadBillingWebhookEvents(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.billing_webhook_events_crud, 'read');
}

export function canReplayBillingWebhookEvents(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.billing_webhook_events_crud, 'update');
}

export function canUpdateNotifications(user: CurrentUser): boolean {
  return userHasCrud(user, user.permissions?.notifications_crud, 'update');
}

/** Matches feed lifecycle `takedown` from management feeds API. */
export const LIFECYCLE_TAKEDOWN_KEY = 'takedown';

export function feedOperationsRequireConfirm(params: {
  lifecycleStateKey: string;
  activeConditionKeys: string[];
}): boolean {
  if (params.lifecycleStateKey === LIFECYCLE_TAKEDOWN_KEY) {
    return true;
  }
  const keys = params.activeConditionKeys;
  const spamLike = keys.includes('spam_detected') && !keys.includes('spam_permitted');
  return spamLike;
}
