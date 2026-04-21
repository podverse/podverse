import { cookies } from 'next/headers';

import { ManagementApiRequestService } from '../requests/apiRequestService';
import type { CurrentUser } from '../requests/auth';

/** Matches `ADMIN_AUTH_COOKIE_NAME` in management-api (`pv_mgmt_auth`). */
export const MANAGEMENT_AUTH_COOKIE_NAME = 'pv_mgmt_auth';

/**
 * Resolve the logged-in management user on the server using the HTTP-only auth cookie.
 * Returns null when there is no session or the session is invalid.
 */
export async function getManagementSessionUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MANAGEMENT_AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const service = new ManagementApiRequestService(token);
  try {
    return await service.apiRequest<CurrentUser>({
      path: '/auth/me',
      method: 'GET',
    });
  } catch (error) {
    const isUnauthorized =
      error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { status?: number } }).response?.status === 401;

    if (!isUnauthorized) {
      console.error('Management SSR auth check failed:', error);
    }
    return null;
  }
}
