import type { FrameLocator, Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import {
  DEFAULT_LIST_COMPACT_IFRAME_HEIGHT,
  DEFAULT_LIST_RESPONSIVE_IFRAME_HEIGHT,
  DEFAULT_SINGLE_COMPACT_IFRAME_HEIGHT,
  DEFAULT_SINGLE_RESPONSIVE_IFRAME_HEIGHT,
  getEmbedListCompactIframeHeightPx,
  getEmbedListResponsiveIframeHeightPx,
} from '../../src/lib/embed/embedLayoutDimensions';

export const EMBED_SINGLE_SHELL_HEIGHT = DEFAULT_SINGLE_COMPACT_IFRAME_HEIGHT;
export const EMBED_SINGLE_SHELL_RESPONSIVE_HEIGHT = DEFAULT_SINGLE_RESPONSIVE_IFRAME_HEIGHT;
export const EMBED_LIST_SHELL_HEIGHT = DEFAULT_LIST_COMPACT_IFRAME_HEIGHT;
export const EMBED_LIST_SHELL_RESPONSIVE_HEIGHT = DEFAULT_LIST_RESPONSIVE_IFRAME_HEIGHT;
export const EMBED_LIST_SHELL_HEIGHT_WITH_SELECTOR = getEmbedListCompactIframeHeightPx({
  includePresentationSelector: true,
});
export const EMBED_LIST_SHELL_RESPONSIVE_HEIGHT_WITH_SELECTOR =
  getEmbedListResponsiveIframeHeightPx({
    includePresentationSelector: true,
  });

/** @deprecated Use EMBED_SINGLE_SHELL_RESPONSIVE_HEIGHT */
export const EMBED_SINGLE_SHELL_VIDEO_HEIGHT = EMBED_SINGLE_SHELL_RESPONSIVE_HEIGHT;
/** @deprecated Use EMBED_LIST_SHELL_RESPONSIVE_HEIGHT */
export const EMBED_LIST_SHELL_VIDEO_HEIGHT = EMBED_LIST_SHELL_RESPONSIVE_HEIGHT;
/** @deprecated Use EMBED_LIST_SHELL_RESPONSIVE_HEIGHT_WITH_SELECTOR */
export const EMBED_LIST_SHELL_VIDEO_HEIGHT_WITH_SELECTOR =
  EMBED_LIST_SHELL_RESPONSIVE_HEIGHT_WITH_SELECTOR;

export async function expectEmbedRootVisible(page: Page): Promise<void> {
  await expect(page.getByTestId('embed-root')).toBeVisible();
}

export async function expectEmbedSingleShell(page: Page): Promise<void> {
  await expect(page.getByTestId('embed-single-shell')).toBeVisible();
  await expect(page.getByTestId('embed-player-region')).toBeVisible();
}

export async function expectEmbedListShell(page: Page): Promise<void> {
  await expect(page.getByTestId('embed-list-shell')).toBeVisible();
  await expect(page.getByTestId('embed-list-region')).toBeVisible();
}

export async function expectEmbedNotFoundShell(page: Page): Promise<void> {
  await expect(page.getByTestId('embed-not-found-shell')).toBeVisible();
}

export async function expectEmbedNotAvailableShell(page: Page): Promise<void> {
  await expect(page.getByTestId('embed-not-available')).toBeVisible();
}

export async function expectEmbedResponsiveStage(page: Page): Promise<void> {
  await expect(page.getByTestId('embed-player-loading')).toHaveCount(0);
  await expect(page.getByTestId('embed-responsive-stage')).toBeVisible();
}

export async function expectEmbedResponsiveVideoElement(page: Page): Promise<void> {
  await expectEmbedResponsiveStage(page);
  await expect(page.getByTestId('embed-responsive-video-element')).toBeVisible();
}

export async function expectEmbedResponsiveCenterArt(page: Page): Promise<void> {
  await expectEmbedResponsiveStage(page);
  await expect(page.getByTestId('embed-responsive-center-art')).toBeVisible();

  const centerArtImage = page.getByTestId('embed-responsive-center-art').locator('img').first();
  await expect(centerArtImage).toBeVisible();

  const box = await centerArtImage.boundingBox();
  expect(box).not.toBeNull();
  if (box !== null) {
    expect(box.width).toBeGreaterThan(8);
    expect(box.height).toBeGreaterThan(8);
  }
}

/** @deprecated Use expectEmbedResponsiveStage */
export async function expectEmbedVideoStage(page: Page): Promise<void> {
  await expectEmbedResponsiveStage(page);
}

/** @deprecated Use expectEmbedResponsiveVideoElement */
export async function expectEmbedVideoElement(page: Page): Promise<void> {
  await expectEmbedResponsiveVideoElement(page);
}

/** @deprecated Use expectEmbedResponsiveCenterArt */
export async function expectEmbedVideoCenterArt(page: Page): Promise<void> {
  await expectEmbedResponsiveCenterArt(page);
}

export async function expectEmbedCompactShellNoVideoElement(page: Page): Promise<void> {
  await expect(page.getByTestId('embed-player-loading')).toHaveCount(0);
  await expect(page.getByTestId('embed-responsive-stage')).toHaveCount(0);
  await expect(page.getByTestId('embed-responsive-video-element')).toHaveCount(0);
  await expect(page.getByTestId('embed-player-info')).toBeVisible();
}

export function embedTitleLocator(scope: Page | FrameLocator): Locator {
  return scope.getByTestId('embed-title-toggle').or(scope.getByTestId('embed-title'));
}

export async function expectEmbedAudioPlayerMetadata(page: Page): Promise<void> {
  await expect(page.getByTestId('embed-player-loading')).toHaveCount(0);
  await expect(page.getByTestId('embed-player-info')).toBeVisible();
  await expect(page.getByTestId('embed-artwork')).toBeVisible();
  await expect(page.getByTestId('embed-channel-title')).toBeVisible();
  await expect(embedTitleLocator(page)).toBeVisible();
}

export async function expectEmbedArtworkSrcContains(page: Page, fragment: string): Promise<void> {
  const artworkImage = page.getByTestId('embed-artwork').locator('img').first();
  await expect(artworkImage).toBeVisible();
  const src = await artworkImage.getAttribute('src');
  expect(src).not.toBeNull();
  if (src !== null) {
    expect(src).toContain(fragment);
  }
}

export async function expectEmbedChapterMarkerCount(page: Page, minCount: number): Promise<void> {
  const markers = page.locator('[class*="chapterMarker"]');
  await expect.poll(async () => markers.count()).toBeGreaterThanOrEqual(minCount);
}

export async function expectNoEmbedChapterMarkers(page: Page): Promise<void> {
  await expect(page.locator('[class*="chapterMarker"]')).toHaveCount(0);
}

export async function expectEmbedBrandLogoMainSiteLink(
  page: Page,
  expectedHref: string
): Promise<void> {
  const brandLogoLink = page.getByTestId('embed-brand-logo-link');
  await expect(brandLogoLink).toBeVisible();
  await expect(brandLogoLink).toHaveAttribute('href', expectedHref);
  await expect(brandLogoLink).toHaveAttribute('target', '_blank');
  await expect(brandLogoLink).toHaveAttribute('rel', 'noopener noreferrer');
}

export async function expectEmbedPlayerProgressVisible(page: Page): Promise<void> {
  await expect(page.getByTestId('embed-player-controls')).toBeVisible();
  await expect(page.getByRole('slider')).toBeVisible();
}

export async function seekEmbedPlayerToSeconds(page: Page, seconds: number): Promise<void> {
  await expectEmbedPlayerProgressVisible(page);

  const slider = page.getByRole('slider');
  const durationSeconds = Number(await slider.getAttribute('aria-valuemax'));
  expect(Number.isFinite(durationSeconds)).toBe(true);
  expect(durationSeconds).toBeGreaterThan(0);

  const box = await slider.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }

  const fraction = Math.min(Math.max(seconds / durationSeconds, 0), 1);
  await page.mouse.click(box.x + box.width * fraction, box.y + box.height / 2);

  await expect
    .poll(async () => Number(await slider.getAttribute('aria-valuenow')))
    .toBeGreaterThanOrEqual(seconds - 2);
}

export async function expectEmbedPlayerDuration(
  page: Page,
  expectedDuration: string
): Promise<void> {
  const time = page.getByTestId('embed-player-time');
  await expect(time).toBeVisible();
  await expect(time).toHaveText(expectedDuration);
}

export async function expectEmbedTitleTruncated(page: Page): Promise<void> {
  const title = embedTitleLocator(page);
  await expect(title).toBeVisible();

  const styles = await title.evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return {
      overflow: computed.overflow,
    };
  });

  expect(styles.overflow).toBe('hidden');
}

export async function expectEmbedListRowMetadata(page: Page): Promise<void> {
  const activeRow = page.getByTestId('embed-list-row-active');
  await expect(activeRow).toBeVisible();
  await expect(activeRow.getByTestId('embed-list-row-meta')).toBeVisible();
}

export async function expectEmbedListActiveRowMetaContains(
  page: Page,
  text: string | RegExp
): Promise<void> {
  await expect(page.getByTestId('embed-list-row-active')).toBeVisible();
  await expect(
    page.getByTestId('embed-list-row-active').getByTestId('embed-list-row-meta')
  ).toContainText(text);
}

export async function expectEmbedListActiveRowLabel(
  page: Page,
  labelFragment: string
): Promise<void> {
  await expect(page.getByTestId('embed-list-row-active')).toBeVisible();
  await expect(page.getByTestId('embed-list-row-active')).toContainText(labelFragment);
}

export async function expectEmbedShellHeightStable(
  locator: Locator,
  expectedHeight: number
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (box !== null) {
    expect(box.height).toBeGreaterThanOrEqual(expectedHeight - 2);
    expect(box.height).toBeLessThanOrEqual(expectedHeight + 2);
  }
}

export async function expectFrameElementHeightWithin(
  locator: Locator,
  expectedHeight: number,
  tolerance = 2
): Promise<void> {
  await expect
    .poll(async () => {
      try {
        const height = await locator.evaluate((element) => element.clientHeight);
        return height >= expectedHeight - tolerance && height <= expectedHeight + tolerance;
      } catch {
        // Iframe reloaded mid-evaluate (execution context destroyed); retry.
        return false;
      }
    })
    .toBe(true);
}

export async function expectEmbedListRegionScrollable(page: Page): Promise<void> {
  const region = page.getByTestId('embed-list-region');
  await expect(region).toBeVisible();

  const metrics = await region.evaluate((element) => ({
    overflowY: window.getComputedStyle(element).overflowY,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));

  expect(metrics.overflowY).toBe('auto');
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
}

export async function expectEmbedDemoLinkResolves(page: Page): Promise<void> {
  await expectEmbedRootVisible(page);

  const hasSingle = await page.getByTestId('embed-single-shell').isVisible();
  const hasList = await page.getByTestId('embed-list-shell').isVisible();
  const hasNotFound = await page.getByTestId('embed-not-found-shell').isVisible();
  const hasNotAvailable = await page.getByTestId('embed-not-available').isVisible();

  expect(hasSingle || hasList || hasNotFound || hasNotAvailable).toBe(true);
}
