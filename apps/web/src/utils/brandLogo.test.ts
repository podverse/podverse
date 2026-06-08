import { beforeEach, describe, expect, it, vi } from 'vitest';

type BrandConfigShape = {
  public: {
    brand: {
      logoDark: string;
      logoLight: string;
      logoSquare: string | null;
      logoSquare100x100: string | null;
    };
  };
};

let mockConfig: BrandConfigShape = {
  public: {
    brand: {
      logoDark: '/branding/logo-rectangle-dark.svg',
      logoLight: '/branding/logo-rectangle.svg',
      logoSquare: null,
      logoSquare100x100: null,
    },
  },
};

vi.mock('../config', () => ({
  getConfig: () => mockConfig,
}));

import { getBrandLogoSquareSrc, getBrandLogoSrc } from './brandLogo';

describe('brandLogo utilities', () => {
  beforeEach(() => {
    mockConfig = {
      public: {
        brand: {
          logoDark: '/branding/logo-rectangle-dark.svg',
          logoLight: '/branding/logo-rectangle.svg',
          logoSquare: null,
          logoSquare100x100: null,
        },
      },
    };
  });

  it('returns horizontal wordmarks by UI theme', () => {
    expect(getBrandLogoSrc('light')).toBe('/branding/logo-rectangle.svg');
    expect(getBrandLogoSrc('dark')).toBe('/branding/logo-rectangle-dark.svg');
    expect(getBrandLogoSrc('dracula')).toBe('/branding/logo-rectangle-dark.svg');
  });

  it('returns null for embed square mark when env is unset', () => {
    expect(getBrandLogoSquareSrc()).toBeNull();
  });

  it('returns configured 100x100 square mark URL for embed when env is set', () => {
    mockConfig.public.brand.logoSquare100x100 =
      'https://cdn.example.com/static/images/branding/brand-square-100x100.png';
    expect(getBrandLogoSquareSrc()).toBe(
      'https://cdn.example.com/static/images/branding/brand-square-100x100.png'
    );
  });

  it('does not use full-size square mark for embed', () => {
    mockConfig.public.brand.logoSquare =
      'https://cdn.example.com/static/images/branding/brand-square.png';
    expect(getBrandLogoSquareSrc()).toBeNull();
  });
});
