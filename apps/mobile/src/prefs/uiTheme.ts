import type { UITheme } from '@podverse/design-tokens';

import { getPref, setPref } from './prefsStore';

const UI_THEME_PREF_KEY = 'uit';

export const readUIThemePref = async (): Promise<UITheme | null> => {
  return getPref(UI_THEME_PREF_KEY);
};

export const writeUIThemePref = async (theme: UITheme): Promise<void> => {
  await setPref(UI_THEME_PREF_KEY, theme);
};
