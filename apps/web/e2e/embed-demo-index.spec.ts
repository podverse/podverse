import { expect, test } from '@playwright/test';

import { expectEmbedDemoLinkResolves } from './helpers/embedAssertions';
import { E2E_EMBED_DEMO_SHOWCASE_IDS } from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Embed demo index', () => {
  test('Demo index shows deterministic fixture previews and links resolve to embed shells', async ({
    page,
  }, testInfo) => {
    await page.goto('/embed');
    await expect(page.getByRole('heading', { name: 'Embed demos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Single-item embeds' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'List embeds' })).toBeVisible();

    for (const showcaseId of E2E_EMBED_DEMO_SHOWCASE_IDS) {
      await expect(page.getByTestId(`embed-demo-preview-${showcaseId}`)).toBeVisible();
      const frameContainer = page.getByTestId(`embed-demo-frame-${showcaseId}`);
      await expect(frameContainer).toBeVisible();
      await expect(frameContainer).toHaveCSS('border-top-style', 'solid');
      await expect(frameContainer).toHaveCSS('border-top-width', '1px');

      const iframe = page.getByTestId(`embed-demo-iframe-${showcaseId}`);
      await expect(iframe).toBeVisible();
      await expect(iframe).toHaveCSS('border-top-width', '0px');

      const frame = page.frameLocator(`[data-testid="embed-demo-iframe-${showcaseId}"]`);
      const embedRoot = frame.getByTestId('embed-root');
      const notFoundShell = frame.getByTestId('embed-not-found-shell');
      const notAvailableShell = frame.getByTestId('embed-not-available');

      await expect(embedRoot.or(notFoundShell).or(notAvailableShell)).toBeVisible();
    }

    const demoLinks = page.locator('a[href^="/embed/"]');
    const hrefs = [
      ...new Set(
        await demoLinks.evaluateAll((anchors) =>
          anchors
            .map((anchor) => anchor.getAttribute('href'))
            .filter((href): href is string => href !== null && href.length > 0)
        )
      ),
    ];

    expect(hrefs.length).toBeGreaterThanOrEqual(E2E_EMBED_DEMO_SHOWCASE_IDS.length);

    await capturePageLoad(
      page,
      testInfo,
      'The embed demo index lists deterministic fixture iframe previews for every showcase slot.',
      page.getByRole('heading', { name: 'Embed demos' })
    );

    for (const href of hrefs) {
      await test.step(`Follow demo link ${href}`, async () => {
        await page.goto(href);
        await expectEmbedDemoLinkResolves(page);
      });
    }
  });

  test('Footer embed link opens the demo index', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Embed' }).click();
    await expect(page).toHaveURL('/embed');
    await expect(page.getByRole('heading', { name: 'Embed demos' })).toBeVisible();
  });
});
