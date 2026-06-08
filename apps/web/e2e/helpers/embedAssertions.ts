import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import {
  DEFAULT_LIST_AUDIO_IFRAME_HEIGHT,
  DEFAULT_LIST_VIDEO_IFRAME_HEIGHT,
  DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT,
  DEFAULT_SINGLE_VIDEO_IFRAME_HEIGHT,
} from '../../src/lib/embed/embedLayoutDimensions';

export const EMBED_SINGLE_SHELL_HEIGHT = DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT;
export const EMBED_SINGLE_SHELL_VIDEO_HEIGHT = DEFAULT_SINGLE_VIDEO_IFRAME_HEIGHT;
export const EMBED_LIST_SHELL_HEIGHT = DEFAULT_LIST_AUDIO_IFRAME_HEIGHT;
export const EMBED_LIST_SHELL_VIDEO_HEIGHT = DEFAULT_LIST_VIDEO_IFRAME_HEIGHT;

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

export async function expectEmbedVideoPlaceholder(page: Page): Promise<void> {
  await expect(page.getByTestId('embed-video-placeholder')).toBeVisible();
}

export async function expectEmbedAudioPlayerMetadata(page: Page): Promise<void> {
  await expect(page.getByTestId('embed-player-info')).toBeVisible();
  await expect(page.getByTestId('embed-artwork')).toBeVisible();
  await expect(page.getByTestId('embed-channel-title')).toBeVisible();
  await expect(page.getByTestId('embed-title')).toBeVisible();
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

export async function expectEmbedTitleTruncated(page: Page): Promise<void> {
  const title = page.getByTestId('embed-title');
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
