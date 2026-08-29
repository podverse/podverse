import type {
  AdminNotificationAudience,
  AdminNotificationCampaignStatusValues,
  NotificationCategoryValues,
} from '@podverse/helpers';

import { ManagementApiRequestService } from './apiRequestService.js';

export type NotificationCampaign = {
  id: number;
  id_text: string;
  title: string;
  body: string | null;
  link_path: string | null;
  category: NotificationCategoryValues;
  audience: AdminNotificationAudience;
  send_push: boolean;
  status: AdminNotificationCampaignStatusValues;
  scheduled_at: string | null;
  sent_at: string | null;
  cancelled_at: string | null;
  created_by_admin_id: number | null;
  created_at: string;
  updated_at: string;
  last_error: string | null;
};

export type ListNotificationCampaignsResponse = {
  data: NotificationCampaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateNotificationCampaignParams = {
  title: string;
  body?: string | null;
  link_path?: string | null;
  category: NotificationCategoryValues;
  audience: AdminNotificationAudience;
  send_push?: boolean;
  send_at?: string | null;
};

export async function listNotificationCampaigns(params?: {
  page?: number;
  limit?: number;
  status?: AdminNotificationCampaignStatusValues;
  category?: NotificationCategoryValues;
  jwt?: string;
}): Promise<ListNotificationCampaignsResponse> {
  const service = new ManagementApiRequestService({ jwt: params?.jwt });
  const queryParams = new URLSearchParams();
  if (params?.page !== undefined) {
    queryParams.set('page', String(params.page));
  }
  if (params?.limit !== undefined) {
    queryParams.set('limit', String(params.limit));
  }
  if (params?.status !== undefined) {
    queryParams.set('status', params.status);
  }
  if (params?.category !== undefined) {
    queryParams.set('category', params.category);
  }

  const queryString = queryParams.toString();

  return service.apiRequest<ListNotificationCampaignsResponse>({
    path: `/notifications${queryString === '' ? '' : `?${queryString}`}`,
    method: 'GET',
  });
}

export async function getNotificationCampaign(
  idText: string,
  jwt?: string
): Promise<{ data: NotificationCampaign }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: NotificationCampaign }>({
    path: `/notifications/${idText}`,
    method: 'GET',
  });
}

export async function createNotificationCampaign(
  params: CreateNotificationCampaignParams,
  jwt?: string
): Promise<{ data: NotificationCampaign }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: NotificationCampaign }>({
    path: '/notifications',
    method: 'POST',
    data: params,
  });
}

export async function cancelNotificationCampaign(
  idText: string,
  jwt?: string
): Promise<{ data: NotificationCampaign }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: NotificationCampaign }>({
    path: `/notifications/${idText}/cancel`,
    method: 'POST',
  });
}

export async function deleteNotificationCampaign(
  idText: string,
  jwt?: string
): Promise<{ message: string }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ message: string }>({
    path: `/notifications/${idText}`,
    method: 'DELETE',
  });
}
