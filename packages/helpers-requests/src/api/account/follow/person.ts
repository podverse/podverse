import type { DTOAccount } from '@podverse/helpers';

import type { ApiRequestService } from '../../_request.js';
import { reqAuthMe } from '../../auth/auth.js';

export async function reqAccountFollowPerson(
  api: ApiRequestService,
  params: { person_id_text: string }
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account/follow/person',
    method: 'POST',
    data: { person_id_text: params.person_id_text },
    config: { withCredentials: true },
  });
  return reqAuthMe(api);
}

export async function reqAccountUnfollowPerson(
  api: ApiRequestService,
  params: { person_id_text: string }
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account/unfollow/person',
    method: 'POST',
    data: { person_id_text: params.person_id_text },
    config: { withCredentials: true },
  });
  return reqAuthMe(api);
}
