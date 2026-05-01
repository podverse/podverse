import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function expectOverlayState(
  page: Page,
  expectedTier: 'vts' | 'tocFalse' | 'chapter' | 'none',
  expectedTitle?: string
) {
  await expect(page.getByTestId('mini-overlay-tier')).toHaveText(expectedTier);
  await expect(page.getByTestId('full-overlay-tier')).toHaveText(expectedTier);

  if (expectedTitle) {
    await expect(page.getByTestId('mini-overlay-title')).toHaveText(expectedTitle);
    await expect(page.getByTestId('full-overlay-title')).toHaveText(expectedTitle);
  }
}

export async function expectInfoLinkTargetsItem(page: Page, expectedPath: string) {
  await expect(page.getByTestId('full-overlay-link')).toHaveAttribute('href', expectedPath);
}

export async function expectLikeAffordanceVisibleWhenLoggedOut(page: Page) {
  await expect(page.getByTestId('auth-status')).toHaveText('logged-out');
  await expect(page.getByTestId('vts-like-heart')).toBeVisible();
}
