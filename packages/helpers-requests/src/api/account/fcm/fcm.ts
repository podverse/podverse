import type {
  CreateAccountFCMDeviceParams,
  DeleteAccountFCMDeviceParams,
  DTOAccountFCMDevice,
  UpdateAccountFCMDeviceParams,
} from '@podverse/helpers';

import type { ApiRequestService } from '../../_request.js';

export async function reqAccountFCMDeviceCreate(
  api: ApiRequestService,
  params: CreateAccountFCMDeviceParams
) {
  return api.apiRequest<DTOAccountFCMDevice>({
    path: '/account/fcm-device/create',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountFCMDeviceUpdate(
  api: ApiRequestService,
  params: UpdateAccountFCMDeviceParams
) {
  return api.apiRequest<DTOAccountFCMDevice>({
    path: '/account/fcm-device/update',
    method: 'PUT',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountFCMDeviceDelete(
  api: ApiRequestService,
  params: DeleteAccountFCMDeviceParams
) {
  return api.apiRequest<void>({
    path: '/account/fcm-device/delete',
    method: 'DELETE',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountFCMDeviceGetAllForAccount(api: ApiRequestService) {
  return api.apiRequest<DTOAccountFCMDevice[]>({
    path: '/account/fcm-device/all-for-account',
    method: 'GET',
    config: { withCredentials: true },
  });
}

export async function reqAccountFCMDeviceUpdateLocale(
  api: ApiRequestService,
  params: { locale: string }
) {
  return api.apiRequest<{ message: string }>({
    path: '/account/fcm-device/update-locale',
    method: 'PUT',
    data: params,
    config: { withCredentials: true },
  });
}
