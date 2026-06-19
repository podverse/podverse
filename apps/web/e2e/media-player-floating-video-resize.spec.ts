import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  E2E_EMBED_VIDEO_ITEM_ID_TEXT,
  EMBED_SAMPLE_EPISODE_VIDEO_TITLE,
} from './helpers/seedConstants';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

const DESKTOP_VIEWPORT = { width: 1200, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function floatingVideoPortalLocator(page: Page): Locator {
  return page.getByTestId('floating-video-portal');
}

async function startFloatingVideoPlayback(page: Page): Promise<Locator> {
  await page.goto(`/episode/${E2E_EMBED_VIDEO_ITEM_ID_TEXT}`);
  await expect(
    page.getByRole('heading', { name: EMBED_SAMPLE_EPISODE_VIDEO_TITLE })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).first().click();

  const portal = floatingVideoPortalLocator(page);
  await expect(portal).toBeVisible();
  return portal;
}

/**
 * Resize gesture math, aspect-ratio preservation, viewport-fit shrinking, and click
 * suppression are covered deterministically by unit tests
 * (src/utils/mediaPlayer/floatingVideoPortalResize.test.ts and
 * src/hooks/__tests__/useFloatingVideoTransform.resize.test.tsx). The seeded video item is an
 * MP3 labeled video/mp4, so the floating portal remounts during pointer interaction and makes
 * a live desktop drag-resize spec flaky (detached-DOM / timeout). We therefore keep only the
 * stable, churn-free appearance checks here: the handle is present on fine pointers and absent
 * on coarse pointers.
 */
test.describe('Floating video resize desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await loginSeedUser(page);
  });

  test('renders the resize handle on fine pointers', async ({ page }) => {
    const portal = await startFloatingVideoPlayback(page);
    await expect(portal.getByTestId('floating-video-resize-handle')).toBeVisible();
  });
});

test.describe('Floating video resize mobile', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await loginSeedUser(page);
  });

  test('does not render the resize handle on coarse pointers', async ({ page }) => {
    const portal = await startFloatingVideoPlayback(page);
    await expect(portal.getByTestId('floating-video-resize-handle')).toHaveCount(0);
  });
});
