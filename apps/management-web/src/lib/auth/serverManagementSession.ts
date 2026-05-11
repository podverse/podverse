import { cookies } from 'next/headers';

import { ManagementApiRequestService } from '../requests/apiRequestService';
import type { CurrentUser } from '../requests/auth';

/** Matches `ADMIN_AUTH_COOKIE_NAME` in management-api (`pv_mgmt_auth`). */
export const MANAGEMENT_AUTH_COOKIE_NAME = 'pv_mgmt_auth';

/** Validated cookie session: same service instance used for `/auth/me` and follow-on SSR API calls. */
export type ValidatedManagementSession = {
  user: CurrentUser;
  token: string;
  service: ManagementApiRequestService;
};

/**
 * Read the management JWT from cookies only (no API validation).
 * Aligns with web `getSSRJwtFromCookies` in `apps/web/src/utils/auth/ssrAuth.ts`.
 */
export async function getManagementJwtFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(MANAGEMENT_AUTH_COOKIE_NAME)?.value;
}

/**
 * Resolve cookie + validate via management-api `GET /auth/me`, returning user and a configured
 * {@link ManagementApiRequestService} without re-reading cookies (parallel to web `getSSRAuthService`).
 */
export async function getManagementSession(): Promise<ValidatedManagementSession | null> {
  const token = await getManagementJwtFromCookies();
  if (!token) {
    return null;
  }

  const service = new ManagementApiRequestService(token);
  try {
    const user = await service.apiRequest<CurrentUser>({
      path: '/auth/me',
      method: 'GET',
    });
    return { user, token, service };
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

/**
 * Same validation as {@link getManagementSession}, exposing only `user` and `service` for call sites
 * that should not handle raw JWT strings (aligned with web `getSSRAuthService` usage).
 */
export async function getManagementAuthService(): Promise<{
  user: CurrentUser;
  service: ManagementApiRequestService;
} | null> {
  const session = await getManagementSession();
  if (!session) {
    return null;
  }
  return { user: session.user, service: session.service };
}

/**
 * Resolve the logged-in management user on the server using the HTTP-only auth cookie.
 * Returns null when there is no session or the session is invalid.
 */
export async function getManagementSessionUser(): Promise<CurrentUser | null> {
  const session = await getManagementSession();
  return session?.user ?? null;
}
