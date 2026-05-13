import { expect, test } from '@playwright/test';

/**
 * Focus-state consistency: keyboard Tab shows --box-shadow-focus; mouse click does not.
 *
 * Flow: navigate to /episodes → click first episode link → dismiss any auto-opened
 * modal → Tab through key chrome and assert box-shadow is applied on :focus-visible.
 */
test.describe('Focus state consistency', () => {
  test('keyboard Tab shows focus ring on key chrome; mouse click does not', async ({ page }) => {
    test.setTimeout(45_000);

    await test.step('Navigate to /episodes and open the first episode', async () => {
      await page.goto('/episodes');
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

      const firstEpisodeLink = page.getByRole('link').filter({ hasText: /.+/ }).first();
      await expect(firstEpisodeLink).toBeVisible({ timeout: 15_000 });
      await firstEpisodeLink.click();
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
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
      const navLink = page.getByRole('navigation').getByRole('link').first();
      await expect(navLink).toBeVisible({ timeout: 10_000 });
      await navLink.click();
      const shadow = await navLink.evaluate((el) => getComputedStyle(el).boxShadow);
      // After a mouse click :focus-visible does not engage, so box-shadow must remain none/empty.
      expect(shadow).toBe('none');
    });

    await test.step('Tab-focused navigation link shows --box-shadow-focus ring', async () => {
      // Return to episode page via browser history so we can tab into chrome.
      await page.goBack();
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
      await page.waitForLoadState('domcontentloaded');
      await page.bringToFront();
      await page.evaluate(() => {
        window.focus();
      });

      // Keyboard Tab from the page root to the first focusable element in the nav.
      await page.keyboard.press('Tab');

      await expect
        .poll(
          async () =>
            page.evaluate(() => {
              const activeElement = document.activeElement;
              if (!(activeElement instanceof HTMLElement)) {
                return null;
              }
              const tag = activeElement.tagName.toLowerCase();
              if (tag === 'body' || tag === 'html') {
                return null;
              }
              return tag;
            }),
          { timeout: 5_000 }
        )
        .not.toBeNull();

      const shadow = await page.evaluate(() => {
        const activeElement = document.activeElement;
        if (!(activeElement instanceof Element)) {
          return null;
        }
        return getComputedStyle(activeElement).boxShadow;
      });
      // The focus ring must be non-empty (i.e. a box-shadow other than "none" is applied).
      expect(shadow).not.toBeNull();
      expect(shadow).not.toBe('none');
    });

    await test.step('Tab-focused button shows --box-shadow-focus ring', async () => {
      // Episode tab strip buttons use a U-shaped ::after ring (box-shadow none). Assert the global
      // token ring on a chrome control instead of probing tab stops through the sidebar.
      const chromeButton = page.getByRole('button', { name: 'Back' });
      await expect(chromeButton).toBeVisible({ timeout: 10_000 });
      await chromeButton.focus();

      const tag = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
      expect(tag).toBe('button');

      const shadow = await chromeButton.evaluate((el) => getComputedStyle(el).boxShadow);
      expect(shadow).not.toBe('none');
    });
  });
});
