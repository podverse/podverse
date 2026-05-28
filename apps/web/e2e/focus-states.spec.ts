import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

const topChromeNav = (page: Page) => page.locator('nav[data-appearance="web"]');

/**
 * Focus-state consistency: keyboard Tab shows --box-shadow-focus; mouse click does not.
 *
 * Flow: navigate to /episodes → click first episode link → dismiss any auto-opened
 * modal → Tab through key chrome and assert box-shadow is applied on :focus-visible.
 */
test.describe('Focus state consistency', () => {
  test('keyboard Tab shows focus ring on key chrome; mouse click does not', async ({
    page,
  }, testInfo) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 1280, height: 720 });

    await test.step('Navigate to /episodes and open the first episode', async () => {
      await page.goto('/episodes');
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

      const firstEpisodeLink = page.getByRole('link').filter({ hasText: /.+/ }).first();
      await expect(firstEpisodeLink).toBeVisible({ timeout: 15_000 });
      await firstEpisodeLink.click();
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

      await capturePageLoad(
        page,
        testInfo,
        'The first episode detail page loads after navigation from the episodes list.'
      );
    });

    await test.step('Dismiss source-selector or any modal that may auto-open', async () => {
      const closeBtn = page.getByRole('button', { name: 'Close modal' });
      const isVisible = await closeBtn.isVisible();
      if (isVisible) {
        await closeBtn.click();
        await expect(closeBtn).toHaveCount(0);
      }
    });

    await test.step('Mouse-clicked link does not show a focus ring', async () => {
      const footerLink = page.getByRole('contentinfo').getByRole('link', { name: 'About' });
      await expect(footerLink).toBeVisible({ timeout: 10_000 });
      const shadow = await footerLink.evaluate((el) => {
        el.click();
        return getComputedStyle(el).boxShadow;
      });
      // After a mouse click :focus-visible does not engage, so box-shadow must remain none/empty.
      expect(shadow).toBe('none');

      await capturePageLoad(
        page,
        testInfo,
        'The footer About link shows no focus ring after a mouse click.',
        footerLink
      );
    });

    await test.step('Keyboard Tab from a navigation link shows --box-shadow-focus ring on the next focusable element', async () => {
      // `Locator.press('Tab')` focuses the element programmatically and then
      // dispatches a real keyboard Tab keydown/keyup. Tab moves focus to the
      // next focusable element via a real keyboard event, which is exactly
      // what engages `:focus-visible` in Chromium — regardless of whether the
      // previous interaction in this test was a mouse click. This replaces
      // the previous `goBack() + bringToFront() + window.focus() + bare
      // page.keyboard.press('Tab')` dance, which depended on the page being
      // refocused and on Tab from `body`/`html` advancing into the first
      // tabbable element in headless Chromium — both of which were flaky.
      const firstNavLink = page.getByRole('navigation').getByRole('link').first();
      await expect(firstNavLink).toBeVisible({ timeout: 10_000 });
      await firstNavLink.press('Tab');

      const result = await page.evaluate(() => {
        const el = document.activeElement;
        if (!(el instanceof HTMLElement)) {
          return null;
        }
        const tag = el.tagName.toLowerCase();
        if (tag === 'body' || tag === 'html') {
          return null;
        }
        return { tag, shadow: getComputedStyle(el).boxShadow };
      });
      expect(result).not.toBeNull();
      expect(result?.shadow).not.toBe('none');

      await capturePageLoad(
        page,
        testInfo,
        'A top navigation link shows the keyboard focus ring after Tab navigation.',
        topChromeNav(page)
      );
    });

    await test.step('Tab-focused button shows --box-shadow-focus ring', async () => {
      // Episode tab strip buttons use a U-shaped ::after ring (box-shadow none). Assert the global
      // token ring on a top-chrome control (Back/Forward/Account) instead of sidebar tab stops.
      await page.goto('/');
      await expect(topChromeNav(page)).toBeVisible({ timeout: 15_000 });
      await page.evaluate(() => {
        window.focus();
      });

      const maxTabPresses = 80;
      let buttonFocusRing: string | null = null;
      for (let i = 0; i < maxTabPresses; i += 1) {
        await page.keyboard.press('Tab');
        buttonFocusRing = await page.evaluate(() => {
          const activeElement = document.activeElement;
          if (!(activeElement instanceof HTMLElement)) {
            return null;
          }
          if (activeElement.closest('nav[data-appearance="web"]') === null) {
            return null;
          }
          if (activeElement.tagName.toLowerCase() !== 'button') {
            return null;
          }
          return getComputedStyle(activeElement).boxShadow;
        });
        if (buttonFocusRing !== null && buttonFocusRing !== 'none') {
          break;
        }
      }
      expect(buttonFocusRing).not.toBeNull();
      expect(buttonFocusRing).not.toBe('none');

      await capturePageLoad(
        page,
        testInfo,
        'A top-chrome button shows the keyboard focus ring after Tab navigation.',
        topChromeNav(page)
      );
    });
  });
});
