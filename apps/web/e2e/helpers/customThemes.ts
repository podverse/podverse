import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const E2E_CUSTOM_THEMES_MINIMAL_URL =
  'http://localhost:2111/themes/custom-themes.minimal.json';
export const E2E_CUSTOM_THEMES_MULTI_URL = 'http://localhost:2111/themes/custom-themes.multi.json';

export const E2E_LOGIN_EMAIL = 'e2e-user@example.com';
export const E2E_LOGIN_PASSWORD = 'Test!1Aa';

export const CUSTOM_THEME_MINIMAL_ID = 'custom_minimal';
export const CUSTOM_THEME_MIDNIGHT_OCEAN_ID = 'custom_midnight_ocean';
export const CUSTOM_THEME_SUNRISE_SAND_ID = 'custom_sunrise_sand';

/** Built-in dark theme from packages/ui/src/styles/_themes.scss */
export const BUILT_IN_DARK_BACKGROUND_PRIMARY_HEX = '#030626';

/** From custom-themes.minimal.json */
export const CUSTOM_MINIMAL_BACKGROUND_PRIMARY_HEX = '#ff00ff';
export const CUSTOM_MINIMAL_TEXT_PRIMARY_HEX = '#00ff00';

/** From custom-themes.multi.json (custom_midnight_ocean) */
export const CUSTOM_MIDNIGHT_OCEAN_BACKGROUND_PRIMARY_HEX = '#070b14';

/** From custom-themes.multi.json (custom_sunrise_sand) */
export const CUSTOM_SUNRISE_SAND_BACKGROUND_PRIMARY_HEX = '#fff6ec';

const API_LOGIN_URL = 'http://localhost:4030/api/v2/auth/login';

export async function loginE2eUser(page: Page): Promise<void> {
  const loginResponse = await page.request.post(API_LOGIN_URL, {
    data: { email: E2E_LOGIN_EMAIL, password: E2E_LOGIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

export async function gotoSettingsThemeSelector(page: Page): Promise<void> {
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/settings/);
  await expect(page.locator('#settings_theme_selector')).toBeVisible();
}

export async function expectNoCustomThemeStyleTag(page: Page): Promise<void> {
  await expect(page.locator('#pv-custom-theme-variables')).toHaveCount(0);
}

export async function expectCustomThemeStyleTagContains(
  page: Page,
  fragment: string
): Promise<void> {
  const styleTag = page.locator('#pv-custom-theme-variables');
  await expect(styleTag).toHaveCount(1);
  await expect
    .poll(async () => {
      return styleTag.evaluate((element) => element.textContent ?? '');
    })
    .toContain(fragment);
}

export async function expectHtmlUiTheme(page: Page, themeId: string): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-ui-theme', themeId);
}

export async function expectComputedCssVarOnHtml(
  page: Page,
  varName: string,
  expectedHex: string
): Promise<void> {
  const normalizedHex = expectedHex.toLowerCase();
  await expect
    .poll(async () => {
      return page.evaluate((cssVarName) => {
        return getComputedStyle(document.documentElement)
          .getPropertyValue(cssVarName)
          .trim()
          .toLowerCase();
      }, varName);
    })
    .toMatch(hexToComputedColorPattern(normalizedHex));
}

export async function expectBodyBackgroundColorMatchesTheme(
  page: Page,
  expectedHex: string
): Promise<void> {
  const normalizedHex = expectedHex.toLowerCase();
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor.trim().toLowerCase();
      });
    })
    .toMatch(hexToComputedColorPattern(normalizedHex));
}

export async function expectThemeDiffersFromBuiltInDark(page: Page): Promise<void> {
  const darkPattern = hexToComputedColorPattern(BUILT_IN_DARK_BACKGROUND_PRIMARY_HEX);
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        return getComputedStyle(document.documentElement)
          .getPropertyValue('--background-color-primary')
          .trim()
          .toLowerCase();
      });
    })
    .not.toMatch(darkPattern);
}

export async function expectCustomThemeUiColorsApplied(
  page: Page,
  backgroundPrimaryHex: string,
  options?: { textPrimaryHex?: string }
): Promise<void> {
  await expectThemeDiffersFromBuiltInDark(page);
  await expectComputedCssVarOnHtml(page, '--background-color-primary', backgroundPrimaryHex);
  await expectBodyBackgroundColorMatchesTheme(page, backgroundPrimaryHex);
  if (options?.textPrimaryHex !== undefined) {
    await expectComputedCssVarOnHtml(page, '--text-color-primary', options.textPrimaryHex);
  }
}

function hexToComputedColorPattern(hex: string): RegExp {
  const cleaned = hex.replace('#', '').toLowerCase();
  if (cleaned.length !== 6) {
    throw new Error(`Expected 6-digit hex, got ${hex}`);
  }
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  const hexPattern = `#${cleaned}`;
  const rgbPattern = `rgb\\(${r},\\s*${g},\\s*${b}\\)`;
  return new RegExp(`^(?:${hexPattern}|${rgbPattern})$`);
}

const THEME_SELECTOR_ID = 'settings_theme_selector';

function themeSelectorTrigger(page: Page) {
  return page.locator(`#${THEME_SELECTOR_ID}`);
}

function themeSelectorMenu(page: Page) {
  return page.locator(`#${THEME_SELECTOR_ID} + ul[role="menu"]`);
}

export async function openThemeSelectorMenu(page: Page): Promise<void> {
  await themeSelectorTrigger(page).click();
  await expect(themeSelectorMenu(page)).toBeVisible();
}

export async function closeThemeSelectorMenu(page: Page): Promise<void> {
  await themeSelectorTrigger(page).click();
  await expect(themeSelectorMenu(page)).toHaveCount(0);
}

export async function selectThemeByMenuLabel(page: Page, label: string): Promise<void> {
  await openThemeSelectorMenu(page);
  await themeSelectorMenu(page).getByRole('menuitem', { name: label, exact: true }).click();
  await expect(themeSelectorMenu(page)).toHaveCount(0);
}

export async function expectThemeMenuLabels(page: Page, expectedLabels: string[]): Promise<void> {
  await openThemeSelectorMenu(page);
  const menu = themeSelectorMenu(page);
  for (const label of expectedLabels) {
    await expect(menu.getByRole('menuitem', { name: label, exact: true })).toBeVisible();
  }
  await closeThemeSelectorMenu(page);
}
