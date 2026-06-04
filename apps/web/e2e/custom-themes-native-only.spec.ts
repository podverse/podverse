import { expect, test } from '@playwright/test';

import {
  expectHtmlUiTheme,
  expectNoCustomThemeStyleTag,
  expectThemeMenuLabels,
  gotoSettingsThemeSelector,
  loginE2eUser,
  selectThemeByMenuLabel,
} from './helpers/customThemes';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

test.describe('Custom themes (native built-in only)', () => {
  test('When only built-in themes are configured, settings lists native themes and no remote theme CSS is injected.', async ({
    page,
  }, testInfo) => {
    await loginE2eUser(page);
    await gotoSettingsThemeSelector(page);

    await expectNoCustomThemeStyleTag(page);

    const themeSelector = page.locator('#settings_theme_selector');
    await expectThemeMenuLabels(page, ['Dark', 'Light', 'Dracula']);
    await expect(page.getByRole('menuitem', { name: 'Midnight Ocean' })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'Settings shows the theme selector with built-in theme options only.',
      themeSelector
    );

    await actionAndCapture(
      page,
      testInfo,
      'After selecting the Dracula built-in theme, the document uses the dracula data-ui-theme attribute.',
      async () => {
        await selectThemeByMenuLabel(page, 'Dracula');
        await expectHtmlUiTheme(page, 'dracula');
      },
      page.locator('html')
    );
  });
});
