import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UITheme } from '@podverse/design-tokens';
import { ALL_POSSIBLE_THEMES } from '@podverse/design-tokens';

const UI_THEME_PREF_KEY = 'uit';

const isUITheme = (value: string): value is UITheme => {
  return ALL_POSSIBLE_THEMES.some((theme) => theme === value);
};

export const readUIThemePref = async (): Promise<UITheme | null> => {
  const value = await AsyncStorage.getItem(UI_THEME_PREF_KEY);
  if (value === null) {
    return null;
  }

  if (!isUITheme(value)) {
    return null;
  }

  return value;
};

export const writeUIThemePref = async (theme: UITheme): Promise<void> => {
  await AsyncStorage.setItem(UI_THEME_PREF_KEY, theme);
};
