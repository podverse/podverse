import { test } from '@playwright/test';

import {
  CUSTOM_MIDNIGHT_OCEAN_BACKGROUND_PRIMARY_HEX,
  CUSTOM_SUNRISE_SAND_BACKGROUND_PRIMARY_HEX,
  CUSTOM_THEME_MIDNIGHT_OCEAN_ID,
  expectCustomThemeStyleTagContains,
  expectCustomThemeUiColorsApplied,
  expectHtmlUiTheme,
  expectThemeMenuLabels,
  gotoSettingsThemeSelector,
  loginE2eUser,
  selectThemeByMenuLabel,
} from './helpers/customThemes';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

test.describe('Custom themes (built-in plus remote pack)', () => {
  test('When built-in and remote themes are both available, settings lists both and remote CSS is injected.', async ({
    page,
  }, testInfo) => {
    await loginE2eUser(page);
    await gotoSettingsThemeSelector(page);

    await expectCustomThemeStyleTagContains(
      page,
      `[data-ui-theme='${CUSTOM_THEME_MIDNIGHT_OCEAN_ID}']`
    );
    await expectCustomThemeStyleTagContains(
      page,
      "[data-ui-theme='custom_sunrise_sand']"
    );

    const themeSelector = page.locator('#settings_theme_selector');
    await expectThemeMenuLabels(page, ['Midnight Ocean', 'Sunrise Sand', 'Dark', 'Light']);

    await capturePageLoad(
      page,
      testInfo,
      'Settings shows built-in and remote custom themes in the theme selector.',
      themeSelector
    );
  });

  test('When the visitor selects Midnight Ocean or Sunrise Sand, custom UI colors apply; Dark uses the built-in theme id.', async ({
    page,
  }, testInfo) => {
    await loginE2eUser(page);
    await gotoSettingsThemeSelector(page);

    await actionAndCapture(
      page,
      testInfo,
      'After selecting Midnight Ocean, the document uses the custom theme id and paints with remote background tokens.',
      async () => {
        await selectThemeByMenuLabel(page, 'Midnight Ocean');
        await expectHtmlUiTheme(page, CUSTOM_THEME_MIDNIGHT_OCEAN_ID);
        await expectCustomThemeUiColorsApplied(
          page,
          CUSTOM_MIDNIGHT_OCEAN_BACKGROUND_PRIMARY_HEX
        );
      },
      page.locator('body')
    );

    await actionAndCapture(
      page,
      testInfo,
      'After selecting Sunrise Sand, the page uses the warm custom background token on the body.',
      async () => {
        await selectThemeByMenuLabel(page, 'Sunrise Sand');
        await expectHtmlUiTheme(page, 'custom_sunrise_sand');
        await expectCustomThemeUiColorsApplied(
          page,
          CUSTOM_SUNRISE_SAND_BACKGROUND_PRIMARY_HEX
        );
      },
      page.locator('body')
    );

    await actionAndCapture(
      page,
      testInfo,
      'After selecting the built-in Dark theme, the document uses the dark data-ui-theme attribute.',
      async () => {
        await selectThemeByMenuLabel(page, 'Dark');
        await expectHtmlUiTheme(page, 'dark');
      },
      page.locator('html')
    );
  });
});
