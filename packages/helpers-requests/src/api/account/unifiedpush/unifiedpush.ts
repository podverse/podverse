import type {
  CreateAccountUPDeviceParams,
  DeleteAccountUPDeviceParams,
  DTOAccountUPDevice,
  UpdateAccountUPDeviceParams,
} from '@podverse/helpers';

import type { ApiRequestService } from '../../_request.js';

export async function reqAccountUPDeviceCreate(
  api: ApiRequestService,
  params: CreateAccountUPDeviceParams
) {
  return api.apiRequest<DTOAccountUPDevice>({
    path: '/account/up-device/create',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountUPDeviceUpdate(
  api: ApiRequestService,
  params: UpdateAccountUPDeviceParams
) {
  return api.apiRequest<DTOAccountUPDevice>({
    path: '/account/up-device/update',
    method: 'PUT',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountUPDeviceDelete(
  api: ApiRequestService,
  params: DeleteAccountUPDeviceParams
) {
  return api.apiRequest<void>({
    path: '/account/up-device/delete',
    method: 'DELETE',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountUPDeviceGetForAccount(api: ApiRequestService) {
  return api.apiRequest<DTOAccountUPDevice | null>({
    path: '/account/up-device/for-account',
    method: 'GET',
    config: { withCredentials: true },
  });
}

export async function reqAccountUPDeviceUpdateLocale(
  api: ApiRequestService,
  params: { locale: string }
) {
  return api.apiRequest<{ message: string }>({
    path: '/account/up-device/update-locale',
    method: 'PUT',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountUPDeviceDeleteAll(api: ApiRequestService) {
  return api.apiRequest<{ message: string }>({
    path: '/account/up-device/delete-all',
    method: 'DELETE',
    config: { withCredentials: true },
  });
}
