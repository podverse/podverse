/**
 * Default `id_text` strings for API integration test JWTs and mocks.
 * Must stay within `nano_id_v2` bounds (7–15 chars); see `NANO_ID_V2_*` in `@podverse/orm`.
 */
export const TEST_USER_ACCOUNT_ID_TEXT = 'pvtestid01';

export const TEST_ADMIN_E2E_ID_TEXT = 'pvtestadm01';

/** The `sid` that {@link authHeaders} signs and the session store stub reports as active. */
export const TEST_ACCOUNT_SESSION_ID_TEXT = 'pvtestses01';
