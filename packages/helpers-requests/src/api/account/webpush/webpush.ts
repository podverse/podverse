import {
  DTOAccountWebPushDevice,
  CreateAccountWebPushDeviceParams,
  UpdateAccountWebPushDeviceParams,
  DeleteAccountWebPushDeviceParams,
} from '@podverse/helpers';
import { ApiRequestService } from '../../_request';

export async function reqAccountWebPushDeviceCreate(
  api: ApiRequestService,
  params: CreateAccountWebPushDeviceParams
) {
  return api.apiRequest<DTOAccountWebPushDevice>({
    path: '/account/webpush-device/create',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountWebPushDeviceUpdate(
  api: ApiRequestService,
  params: UpdateAccountWebPushDeviceParams
) {
  return api.apiRequest<DTOAccountWebPushDevice>({
    path: '/account/webpush-device/update',
    method: 'PUT',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountWebPushDeviceDelete(
  api: ApiRequestService,
  params: DeleteAccountWebPushDeviceParams
) {
  return api.apiRequest<void>({
    path: '/account/webpush-device/delete',
    method: 'DELETE',
    data: params,
    config: { withCredentials: true },
  });
}

export async function reqAccountWebPushDeviceGetAllForAccount(api: ApiRequestService) {
  return api.apiRequest<DTOAccountWebPushDevice[]>({
    path: '/account/webpush-device/all-for-account',
    method: 'GET',
    config: { withCredentials: true },
  });
}
