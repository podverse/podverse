import { describe, expect, it } from 'vitest';

import { buildCustomThemesCssText, parseRemoteThemePack } from './customThemes';

describe('customThemes helpers', () => {
  it('parses a valid remote theme pack', () => {
    const parsed = parseRemoteThemePack({
      version: '1',
      themes: [
        {
          id: 'Brand-Dark',
          cssVariables: {
            '--pv-color-brand-primary': '#123456',
          },
          labels: {
            'en-US': 'Brand Dark',
          },
        },
      ],
    });
    expect(parsed).toEqual({
      version: '1',
      themes: [
        {
          id: 'brand-dark',
          cssVariables: {
            '--pv-color-brand-primary': '#123456',
          },
          labels: {
            'en-US': 'Brand Dark',
          },
        },
      ],
    });
  });

  it('rejects invalid theme packs', () => {
    expect(
      parseRemoteThemePack({
        version: '1',
        themes: [
          {
            id: '',
            cssVariables: {
              '--pv-color-brand-primary': '#123456',
            },
          },
        ],
      })
    ).toBeUndefined();
  });

  it('builds css text for custom themes', () => {
    const cssText = buildCustomThemesCssText([
      {
        id: 'brand-dark',
        cssVariables: {
          '--pv-color-brand-primary': '#123456',
          '--pv-color-neutral-100': '#ffffff',
        },
      },
    ]);
    expect(cssText).toContain("[data-ui-theme='brand-dark']");
    expect(cssText).toContain('--pv-color-brand-primary: #123456;');
  });
});
