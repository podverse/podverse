/**
 * Deterministic E2E seed ids the mobile app needs to reference directly under
 * `EXPO_PUBLIC_MOBILE_E2E=1`. Mirror of `apps/web/e2e/helpers/seedConstants.ts` /
 * `tools/web/seed-e2e.mjs` (same seeded Postgres row); keep both sides in sync.
 *
 * Today this is only the standalone video-medium item used by the video mini->full transition E2E
 * (master step 2.33 / detail 112), which the app reaches via an E2E-gated affordance because there
 * is no video browse/search UI yet.
 */

/** `E2E_VIDEO_ITEM_ID_TEXT` — the seeded video-medium episode (`e2eVideoChnl01`). */
export const E2E_VIDEO_ITEM_ID_TEXT = 'e2eVideoItm001';
