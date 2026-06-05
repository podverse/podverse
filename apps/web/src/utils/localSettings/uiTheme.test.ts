import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RemoteThemeDefinition } from '@podverse/ui';

type ThemeConfigShape = {
  public: {
    theme: {
      valid?: string;
      default?: string;
      customThemes?: RemoteThemeDefinition[];
    };
  };
};

let mockConfig: ThemeConfigShape = {
  public: {
    theme: {
      valid: '',
      default: '',
      customThemes: undefined,
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
          customThemes: undefined,
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

  it('includes custom themes in valid themes list', () => {
    mockConfig.public.theme.valid = 'dark';
    mockConfig.public.theme.customThemes = [
      {
        id: 'brand-midnight',
        cssVariables: {
          '--pv-color-brand-primary': '#123456',
        },
      },
    ];
    expect(getValidThemes()).toEqual(['dark', 'brand-midnight']);
  });

  it('uses first custom theme as default when custom themes are loaded', () => {
    mockConfig.public.theme.default = 'light';
    mockConfig.public.theme.customThemes = [
      {
        id: 'brand-midnight',
        cssVariables: {
          '--pv-color-brand-primary': '#123456',
        },
      },
      {
        id: 'brand-daylight',
        cssVariables: {
          '--pv-color-brand-primary': '#abcdef',
        },
      },
    ];
    expect(getDefaultTheme()).toBe('brand-midnight');
    expect(toUITheme('light')).toBe('light');
    expect(toUITheme('unknown-theme')).toBe('brand-midnight');
  });
});
