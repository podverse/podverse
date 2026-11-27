import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

async function openBrowse(page: Page) {
  await page.goto('/');
  await expect(page).toHaveURL(/\/browse$/);
  await expect(page.getByRole('heading', { name: 'Browse', exact: true })).toBeVisible();
}

async function columnMaxWidthPx(column: Locator): Promise<number> {
  return column.evaluate((el) => {
    const raw = getComputedStyle(el).maxWidth;
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) {
      throw new Error(`main column max-width is not a length: ${raw}`);
    }
    return value;
  });
}

test.describe('Page column width', () => {
  test('When the window is wider than the page column, the column stops at the content max width.', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await openBrowse(page);

    const column = page.getByTestId('main-column');
    await expect(column).toBeVisible();
    const columnBox = await column.boundingBox();
    const mainBox = await page.locator('#mainOuterWrapper main').boundingBox();
    expect(columnBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    if (columnBox === null || mainBox === null) {
      return;
    }

    const maxWidth = await columnMaxWidthPx(column);
    expect(Math.abs(columnBox.width - maxWidth)).toBeLessThanOrEqual(1);
    expect(mainBox.x + mainBox.width - (columnBox.x + columnBox.width)).toBeGreaterThan(200);

    await capturePageLoad(
      page,
      testInfo,
      'A wide window leaves empty space beside the page column.',
      column
    );
  });

  test('When the window is narrower than the page column, the column shrinks with the window.', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await openBrowse(page);

    const column = page.getByTestId('main-column');
    await expect(column).toBeVisible();
    const columnBox = await column.boundingBox();
    expect(columnBox).not.toBeNull();
    if (columnBox === null) {
      return;
    }

    const maxWidth = await columnMaxWidthPx(column);
    expect(columnBox.width).toBeLessThan(maxWidth - 40);

    await capturePageLoad(
      page,
      testInfo,
      'A narrower window lets the page column shrink under its max width.',
      column
    );
  });
});
