import {
  DTOAccountUPDevice,
  CreateAccountUPDeviceParams,
  UpdateAccountUPDeviceParams,
  DeleteAccountUPDeviceParams,
} from 'src/dtos';
import { ApiRequestService } from '../../_request';

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
