import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  E2E_EMBED_VIDEO_ITEM_ID_TEXT,
  EMBED_SAMPLE_EPISODE_VIDEO_TITLE,
} from './helpers/seedConstants';
import { captureVerifiedElement } from './helpers/stepScreenshots';

const API_BASE_URL = 'http://localhost:4030/api/v2';
const API_LOGIN_URL = `${API_BASE_URL}/auth/login`;
const LOGIN_EMAIL = 'e2e-user@example.com';
const LOGIN_PASSWORD = 'Test!1Aa';

/** Sync with packages/ui/src/styles/_variables-root.scss + #media-player 1px border-top */
const MEDIA_PLAYER_HEIGHT_DESKTOP_PX = 100;
const MEDIA_PLAYER_BORDER_TOP_PX = 1;
const DESKTOP_VIEWPORT = { width: 1200, height: 900 };

async function loginSeedUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

function floatingVideoPortalLocator(page: Page): Locator {
  return page.getByTestId('floating-video-portal');
}

/**
 * Livestream floating portal uses the same SCSS defaults; no video live_item seed yet
 * (see MEDIA-PLAYER-DECISION-MATRIX.md § 6c). Verify livestream manually when a feed is
 * available.
 */
test.describe('Floating video default appearance', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await loginSeedUser(page);
  });

  test('loads the floating video portal flush to the right edge and bottom bar with square corners', async ({
    page,
  }, testInfo) => {
    await page.goto(`/episode/${E2E_EMBED_VIDEO_ITEM_ID_TEXT}`);
    await expect(
      page.getByRole('heading', { name: EMBED_SAMPLE_EPISODE_VIDEO_TITLE })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Play' }).first().click();

    const portal = floatingVideoPortalLocator(page);
    await expect(portal).toBeVisible();
    await expect(portal.locator('video')).toBeVisible();

    const computed = await portal.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        right: style.right,
        bottom: style.bottom,
        borderTopLeftRadius: style.borderTopLeftRadius,
      };
    });

    expect(computed.right).toBe('0px');
    expect(computed.bottom).toBe(
      `${MEDIA_PLAYER_HEIGHT_DESKTOP_PX + MEDIA_PLAYER_BORDER_TOP_PX}px`
    );
    expect(computed.borderTopLeftRadius).toBe('0px');

    const portalBox = await portal.boundingBox();
    const mediaPlayerBox = await page.locator('#media-player').boundingBox();
    const viewport = page.viewportSize();
    expect(portalBox).not.toBeNull();
    expect(mediaPlayerBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (portalBox !== null && mediaPlayerBox !== null) {
      expect(portalBox.y + portalBox.height).toBeCloseTo(mediaPlayerBox.y, 0);
    }
    if (portalBox !== null && viewport !== null) {
      expect(portalBox.x + portalBox.width).toBeCloseTo(viewport.width, 0);
    }

    await captureVerifiedElement(
      page,
      testInfo,
      portal,
      'The floating video portal is flush to the right edge and bottom media player bar with square corners.'
    );
  });
});
