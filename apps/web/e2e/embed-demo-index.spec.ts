import { expect, test } from '@playwright/test';

import { expectEmbedDemoLinkResolves } from './helpers/embedAssertions';
import { E2E_EMBED_DEMO_SHOWCASE_IDS } from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Embed demo index', () => {
  test('Demo index shows deterministic fixture previews and links resolve to embed shells', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);

    await page.goto('/embed');
    await expect(page.getByRole('heading', { name: 'Embed player' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Single episodes, tracks, and clips' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Podcasts, albums, and playlists' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Table of Contents', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Table of contents for embed examples' })
    ).toBeVisible();

    const embedPaths: string[] = [];

    for (const showcaseId of E2E_EMBED_DEMO_SHOWCASE_IDS) {
      await expect(page.getByTestId(`embed-demo-preview-${showcaseId}`)).toBeVisible();
      const frameContainer = page.getByTestId(`embed-demo-frame-${showcaseId}`);
      await expect(frameContainer).toBeVisible();
      await expect(frameContainer).toHaveCSS('border-top-style', 'solid');
      await expect(frameContainer).toHaveCSS('border-top-width', '1px');

      const iframe = page.getByTestId(`embed-demo-iframe-${showcaseId}`);
      await iframe.scrollIntoViewIfNeeded();
      await expect(iframe).toBeVisible();
      await expect(iframe).toHaveCSS('border-top-width', '0px');

      const iframeSrc = await iframe.getAttribute('src');
      expect(iframeSrc).not.toBeNull();
      if (iframeSrc !== null) {
        const embedUrl = new URL(iframeSrc, page.url());
        embedPaths.push(`${embedUrl.pathname}${embedUrl.search}`);
      }

      const podcastAudioShowcaseIds = new Set([
        'episode-audio',
        'clip-audio',
        'official-clip-audio',
        'chapter-audio',
        'podcast-audio',
      ]);
      if (podcastAudioShowcaseIds.has(showcaseId)) {
        await expect(iframe).toHaveAttribute('src', /chapter_markers=1/);
      }

      const videoShowcaseIds = new Set([
        'episode-video',
        'track-video',
        'podcast-video',
        'album-video',
      ]);
      if (videoShowcaseIds.has(showcaseId)) {
        await expect(iframe).toHaveAttribute('src', /presentation=video/);
      }

      const frame = page.frameLocator(`[data-testid="embed-demo-iframe-${showcaseId}"]`);
      const embedRoot = frame.getByTestId('embed-root');
      const notFoundShell = frame.getByTestId('embed-not-found-shell');
      const notAvailableShell = frame.getByTestId('embed-not-available');

      await expect(embedRoot.or(notFoundShell).or(notAvailableShell)).toBeVisible({
        timeout: 15_000,
      });
    }

    const hrefs = [...new Set(embedPaths)];

    expect(hrefs.length).toBe(E2E_EMBED_DEMO_SHOWCASE_IDS.length);

    await capturePageLoad(
      page,
      testInfo,
      'The embed demo index lists deterministic fixture iframe previews for every showcase slot.',
      page.getByRole('heading', { name: 'Embed player' })
    );

    await test.step('Table of contents jumps to a demo anchor', async () => {
      await page.getByRole('link', { name: 'Episode (audio)' }).click();
      await expect(page).toHaveURL(/#embed-demo-episode-audio$/);
      await expect(page.locator('#embed-demo-episode-audio')).toBeVisible();
    });

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
    await expect(page.getByRole('heading', { name: 'Embed player' })).toBeVisible();
  });
});
