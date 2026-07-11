import { describe, expect, it } from 'vitest';

import { getThemeTokens } from './tokens.js';
import { ALL_POSSIBLE_THEMES } from './uiTheme.js';

const REQUIRED_KEYS = {
  background: ['primary', 'secondary', 'tertiary', 'quaternary', 'special'] as const,
  border: ['primary', 'secondary', 'tertiary'] as const,
  button: ['primaryBg', 'primaryColor', 'secondaryBg', 'secondaryColor'] as const,
  text: ['primary', 'secondary', 'accent'] as const,
} as const;

describe('getThemeTokens', () => {
  it('returns required token keys for every built-in theme', () => {
    ALL_POSSIBLE_THEMES.forEach((theme) => {
      const tokens = getThemeTokens(theme);

      REQUIRED_KEYS.background.forEach((key) => {
        expect(tokens.background[key]).toBeTruthy();
      });
      REQUIRED_KEYS.text.forEach((key) => {
        expect(tokens.text[key]).toBeTruthy();
      });
      REQUIRED_KEYS.border.forEach((key) => {
        expect(tokens.border[key]).toBeTruthy();
      });
      REQUIRED_KEYS.button.forEach((key) => {
        expect(tokens.button[key]).toBeTruthy();
      });
    });
  });
});
