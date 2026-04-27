import { beforeEach, describe, expect, it, vi } from 'vitest';

type ThemeConfigShape = {
  public: {
    theme: {
      valid?: string;
      default?: string;
    };
  };
};

let mockConfig: ThemeConfigShape = {
  public: {
    theme: {
      valid: '',
      default: '',
    },
  },
};

vi.mock('../../config', () => ({
  getConfig: () => mockConfig,
}));

import { getDefaultTheme, getValidThemes, toUITheme } from './uiTheme.js';

describe('uiTheme utilities', () => {
  beforeEach(() => {
    mockConfig = {
      public: {
        theme: {
          valid: '',
          default: '',
        },
      },
    };
  });

  it('returns all themes when valid theme config is blank', () => {
    expect(getValidThemes()).toEqual(['dark', 'light', 'dracula', 'violet']);
  });

  it('filters invalid configured themes', () => {
    mockConfig.public.theme.valid = 'dark,invalid,light';
    expect(getValidThemes()).toEqual(['dark', 'light']);
  });

  it('falls back to dark default when configured default is invalid', () => {
    mockConfig.public.theme.valid = 'dark,light';
    mockConfig.public.theme.default = 'invalid';
    expect(getDefaultTheme()).toBe('dark');
  });

  it('uses normalized valid input and falls back for invalid values', () => {
    mockConfig.public.theme.valid = 'dark,light';
    mockConfig.public.theme.default = 'light';
    expect(toUITheme('DARK')).toBe('dark');
    expect(toUITheme('not-a-theme')).toBe('light');
    expect(toUITheme()).toBe('light');
  });
});
