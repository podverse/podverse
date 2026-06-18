import { expect, test } from '@playwright/test';

import {
  CUSTOM_MINIMAL_BACKGROUND_PRIMARY_HEX,
  CUSTOM_MINIMAL_TEXT_PRIMARY_HEX,
  CUSTOM_THEME_MINIMAL_ID,
  expectCustomThemeStyleTagContains,
  expectCustomThemeUiColorsApplied,
  expectHtmlUiTheme,
  expectThemeMenuLabels,
  gotoSettingsThemeSelector,
  loginE2eUser,
  selectThemeByMenuLabel,
} from './helpers/customThemes';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

test.describe('Custom themes (remote pack only)', () => {
  test('When a remote custom theme pack is configured, SSR injects theme CSS and settings lists custom themes.', async ({
    page,
  }, testInfo) => {
    await loginE2eUser(page);
    await gotoSettingsThemeSelector(page);

    await expectCustomThemeStyleTagContains(page, `[data-ui-theme='${CUSTOM_THEME_MINIMAL_ID}']`);

    const themeSelector = page.locator('#settings_theme_selector');
    await expect(themeSelector).toContainText('Dark');
    await expectThemeMenuLabels(page, ['Dark', 'custom_minimal']);
    await expectHtmlUiTheme(page, 'dark');

    await actionAndCapture(
      page,
      testInfo,
      'After selecting the remote custom theme, canonical background and text tokens paint the page body.',
      async () => {
        await selectThemeByMenuLabel(page, 'custom_minimal');
        await expectHtmlUiTheme(page, CUSTOM_THEME_MINIMAL_ID);
        await expectCustomThemeUiColorsApplied(page, CUSTOM_MINIMAL_BACKGROUND_PRIMARY_HEX, {
          textPrimaryHex: CUSTOM_MINIMAL_TEXT_PRIMARY_HEX,
        });
      },
      page.locator('body')
    );

    await capturePageLoad(
      page,
      testInfo,
      'Settings shows the theme selector with Dark as the configured default and remote themes in the menu.',
      themeSelector
    );
  });

  test('When the visitor selects the built-in Dark theme, data-ui-theme switches to dark.', async ({
    page,
  }, testInfo) => {
    await loginE2eUser(page);
    await gotoSettingsThemeSelector(page);

    await actionAndCapture(
      page,
      testInfo,
      'After choosing the built-in Dark theme, the document uses the dark data-ui-theme attribute.',
      async () => {
        await selectThemeByMenuLabel(page, 'Dark');
        await expectHtmlUiTheme(page, 'dark');
      },
      page.locator('html')
    );
  });
});
