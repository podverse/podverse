import { ManagementApiRequestService } from './apiRequestService.js';

export type BillingCheckoutChannel = {
  id: number;
  processor_id: string;
  platform: string;
  storefront_allowlist: string[];
  enabled: boolean;
  min_client_version: string | null;
  updated_at: string;
};

export type UpdateBillingCheckoutChannelParams = {
  enabled?: boolean;
  min_client_version?: string | null;
  storefront_allowlist?: string[];
};

export type BillingProcessorProduct = {
  id: number;
  processor_id: string;
  external_product_id: string;
  external_base_plan_id: string | null;
  billing_product_id: number;
  billing_cadence: string;
  purchase_kind: string;
  is_active: boolean;
  updated_at: string;
};

export type CreateBillingProcessorProductParams = {
  processor_id: string;
  external_product_id: string;
  external_base_plan_id?: string | null;
  billing_cadence: 'monthly' | 'annual';
  purchase_kind: 'auto_renew' | 'one_time';
};

export type UpdateBillingProcessorProductParams = {
  is_active?: boolean;
  external_product_id?: string;
  external_base_plan_id?: string | null;
};

export type BillingAccountSubscription = {
  id: number;
  processor_id: string;
  external_subscription_id: string;
  external_product_id: string | null;
  status: string;
  purchase_kind: string;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_period_ends_at: string | null;
  cancel_at_period_end: boolean;
  banked_seconds: number;
  is_sandbox: boolean;
};

export type BillingAccountTransaction = {
  id: number;
  processor_id: string;
  external_transaction_id: string;
  billing_subscription_id: number | null;
  purchase_kind: string;
  amount: string | null;
  currency_code: string | null;
  settled_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
  is_sandbox: boolean;
};

export type BillingAccountGrant = {
  id: number;
  source: string;
  starts_at: string;
  ends_at: string;
  revoked_at: string | null;
  billing_subscription_id: number | null;
  billing_transaction_id: number | null;
};

export type BillingWebhookEvent = {
  id: string;
  processor_id: string;
  external_event_id: string;
  schema_version: string;
  status: string;
  attempts: number;
  received_at: string;
  processed_at: string | null;
  process_error: string | null;
};

export type BillingAccountDetail = {
  account_id: number;
  membership_expires_at: string | null;
  subscriptions: BillingAccountSubscription[];
  transactions: BillingAccountTransaction[];
  grants: BillingAccountGrant[];
  webhook_events: BillingWebhookEvent[];
};

export type BillingResyncSubscriptionResult = {
  subscription_id: number;
  processor_id: string;
  status: string;
  reason?: string;
  account_id?: number;
  membership_expires_at?: string | null;
};

export type BillingResyncResult = {
  account_id: number;
  membership_expires_at: string | null;
  subscriptions: BillingResyncSubscriptionResult[];
  inbox_events: BillingWebhookEventReplayResult[];
};

export type BillingGrantResult = {
  account_id: number;
  applied: boolean;
  membership_expires_at: string | null;
};

export type BillingWebhookEventReplayResult = {
  status: string;
  inbox_event_id: string;
  account_id?: number;
  membership_expires_at?: string | null;
  error_code?: string;
  message?: string;
};

export type ListBillingWebhookEventsParams = {
  status?: 'pending' | 'processed' | 'failed';
  processor_id?: string;
  account_id?: number;
  limit?: number;
};

export async function listBillingCheckoutChannels(
  jwt?: string
): Promise<{ data: BillingCheckoutChannel[] }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: BillingCheckoutChannel[] }>({
    path: '/billing/checkout-channels',
  });
}

export async function updateBillingCheckoutChannel(
  id: number,
  params: UpdateBillingCheckoutChannelParams,
  jwt?: string
): Promise<{ data: BillingCheckoutChannel }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: BillingCheckoutChannel }>({
    path: `/billing/checkout-channels/${id}`,
    method: 'PATCH',
    data: params,
  });
}

export async function listBillingProcessorProducts(
  jwt?: string
): Promise<{ data: BillingProcessorProduct[] }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: BillingProcessorProduct[] }>({
    path: '/billing/processor-products',
  });
}

export async function createBillingProcessorProduct(
  params: CreateBillingProcessorProductParams,
  jwt?: string
): Promise<{ data: BillingProcessorProduct }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: BillingProcessorProduct }>({
    path: '/billing/processor-products',
    method: 'POST',
    data: params,
  });
}

export async function updateBillingProcessorProduct(
  id: number,
  params: UpdateBillingProcessorProductParams,
  jwt?: string
): Promise<{ data: BillingProcessorProduct }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: BillingProcessorProduct }>({
    path: `/billing/processor-products/${id}`,
    method: 'PATCH',
    data: params,
  });
}

export async function getBillingAccount(
  accountId: number,
  jwt?: string
): Promise<{ data: BillingAccountDetail }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: BillingAccountDetail }>({
    path: `/billing/accounts/${accountId}`,
  });
}

export async function resyncBillingAccount(
  accountId: number,
  jwt?: string
): Promise<{ data: BillingResyncResult }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: BillingResyncResult }>({
    path: `/billing/accounts/${accountId}/resync`,
    method: 'POST',
  });
}

export async function grantBillingMembership(
  accountId: number,
  cadence: 'monthly' | 'annual',
  jwt?: string
): Promise<{ data: BillingGrantResult }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: BillingGrantResult }>({
    path: `/billing/accounts/${accountId}/grants`,
    method: 'POST',
    data: { cadence },
  });
}

export async function listBillingWebhookEvents(
  params: ListBillingWebhookEventsParams,
  jwt?: string
): Promise<{ data: BillingWebhookEvent[] }> {
  const query = new URLSearchParams();
  if (params.status !== undefined) {
    query.set('status', params.status);
  }
  if (params.processor_id !== undefined) {
    query.set('processor_id', params.processor_id);
  }
  if (params.account_id !== undefined) {
    query.set('account_id', String(params.account_id));
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  const search = query.toString();
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: BillingWebhookEvent[] }>({
    path: `/billing/webhook-events${search === '' ? '' : `?${search}`}`,
  });
}

export async function replayBillingWebhookEvent(
  id: string,
  jwt?: string
): Promise<{ data: BillingWebhookEventReplayResult }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: BillingWebhookEventReplayResult }>({
    path: `/billing/webhook-events/${id}/replay`,
    method: 'POST',
  });
}
