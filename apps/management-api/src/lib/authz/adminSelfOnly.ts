export type AdminSelfAccessResult =
  | { allowed: true }
  | { allowed: false; reason: 'unauthenticated' }
  | { allowed: false; reason: 'forbidden' };

/**
 * Restrict GET /admin-account/:id to the authenticated admin's own id (PVSA-001).
 */
export function checkAdminAccountSelfAccess(
  sessionUserId: number | undefined,
  requestedAdminId: number
): AdminSelfAccessResult {
  if (sessionUserId === undefined || sessionUserId === null || Number.isNaN(sessionUserId)) {
    return { allowed: false, reason: 'unauthenticated' };
  }
  if (sessionUserId !== requestedAdminId) {
    return { allowed: false, reason: 'forbidden' };
  }
  return { allowed: true };
}
