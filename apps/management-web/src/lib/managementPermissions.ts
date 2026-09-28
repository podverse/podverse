import type { CurrentUser } from './requests/auth';

const CRUD_CREATE = 1;
const CRUD_READ = 2;
const CRUD_UPDATE = 4;
const CRUD_DELETE = 8;

export function canReadAdmins(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  return (
    user.permissions !== null &&
    user.permissions !== undefined &&
    (user.permissions.admins_crud & CRUD_READ) !== 0
  );
}

export function canCreateAdmins(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  return (
    user.permissions !== null &&
    user.permissions !== undefined &&
    (user.permissions.admins_crud & CRUD_CREATE) !== 0
  );
}

export function canUpdateAdmins(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  return (
    user.permissions !== null &&
    user.permissions !== undefined &&
    (user.permissions.admins_crud & CRUD_UPDATE) !== 0
  );
}

export function canDeleteAdmins(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  return (
    user.permissions !== null &&
    user.permissions !== undefined &&
    (user.permissions.admins_crud & CRUD_DELETE) !== 0
  );
}

export function canReadFeeds(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  return (
    user.permissions !== null &&
    user.permissions !== undefined &&
    (user.permissions.feeds_crud & CRUD_READ) !== 0
  );
}

export function canUpdateFeeds(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  return (
    user.permissions !== null &&
    user.permissions !== undefined &&
    (user.permissions.feeds_crud & CRUD_UPDATE) !== 0
  );
}

export function canReadStats(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  return (
    user.permissions !== null &&
    user.permissions !== undefined &&
    (user.permissions.stats_crud & CRUD_READ) !== 0
  );
}

export function canReadStorage(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  const crud = user.permissions?.bucket_crud ?? 0;
  return user.permissions !== null && user.permissions !== undefined && (crud & CRUD_READ) !== 0;
}

export function canDeleteStorage(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  const crud = user.permissions?.bucket_crud ?? 0;
  return user.permissions !== null && user.permissions !== undefined && (crud & CRUD_DELETE) !== 0;
}

export function canReadEmbedDemo(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  const crud = user.permissions?.embed_demo_crud ?? 0;
  return user.permissions !== null && user.permissions !== undefined && (crud & CRUD_READ) !== 0;
}

export function canUpdateEmbedDemo(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  const crud = user.permissions?.embed_demo_crud ?? 0;
  return user.permissions !== null && user.permissions !== undefined && (crud & CRUD_UPDATE) !== 0;
}

export function canReadNotifications(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  const crud = user.permissions?.notifications_crud ?? 0;
  return user.permissions !== null && user.permissions !== undefined && (crud & CRUD_READ) !== 0;
}

export function canCreateNotifications(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  const crud = user.permissions?.notifications_crud ?? 0;
  return user.permissions !== null && user.permissions !== undefined && (crud & CRUD_CREATE) !== 0;
}

function hasCrud(user: CurrentUser, crud: number | undefined, bit: number): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  return user.permissions !== null && user.permissions !== undefined && ((crud ?? 0) & bit) !== 0;
}

export function canReadBillingChannels(user: CurrentUser): boolean {
  return hasCrud(user, user.permissions?.billing_channels_crud, CRUD_READ);
}

export function canUpdateBillingChannels(user: CurrentUser): boolean {
  return hasCrud(user, user.permissions?.billing_channels_crud, CRUD_UPDATE);
}

export function canReadBillingProcessorProducts(user: CurrentUser): boolean {
  return hasCrud(user, user.permissions?.billing_processor_products_crud, CRUD_READ);
}

export function canCreateBillingProcessorProducts(user: CurrentUser): boolean {
  return hasCrud(user, user.permissions?.billing_processor_products_crud, CRUD_CREATE);
}

export function canUpdateBillingProcessorProducts(user: CurrentUser): boolean {
  return hasCrud(user, user.permissions?.billing_processor_products_crud, CRUD_UPDATE);
}

export function canReadBillingAccount(user: CurrentUser): boolean {
  return hasCrud(user, user.permissions?.billing_account_crud, CRUD_READ);
}

export function canResyncBillingAccount(user: CurrentUser): boolean {
  return hasCrud(user, user.permissions?.billing_account_crud, CRUD_UPDATE);
}

export function canGrantBillingMembership(user: CurrentUser): boolean {
  return hasCrud(user, user.permissions?.billing_account_crud, CRUD_CREATE);
}

export function canEndBillingMembership(user: CurrentUser): boolean {
  return hasCrud(user, user.permissions?.billing_account_crud, CRUD_DELETE);
}

export function canReadBillingWebhookEvents(user: CurrentUser): boolean {
  return hasCrud(user, user.permissions?.billing_webhook_events_crud, CRUD_READ);
}

export function canReplayBillingWebhookEvents(user: CurrentUser): boolean {
  return hasCrud(user, user.permissions?.billing_webhook_events_crud, CRUD_UPDATE);
}

export function canUpdateNotifications(user: CurrentUser): boolean {
  if (user.role === 'superuser') {
    return true;
  }
  const crud = user.permissions?.notifications_crud ?? 0;
  return user.permissions !== null && user.permissions !== undefined && (crud & CRUD_UPDATE) !== 0;
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
