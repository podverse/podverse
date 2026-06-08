import { getConfig } from '../config';
import type { UITheme } from './localSettings/uiTheme';

export const getBrandLogoSrc = (uiTheme: UITheme) => {
  const { brand } = getConfig().public;
  switch (uiTheme) {
    case 'light':
      return brand.logoLight;
    case 'dark':
    case 'dracula':
    case 'violet':
    default:
      return brand.logoDark;
  }
};

/** Optional 100×100 square brand mark for embed (`NEXT_PUBLIC_BRAND_LOGO_SQUARE_100X100`). */
export const getBrandLogoSquareSrc = (): string | null => {
  return getConfig().public.brand.logoSquare100x100 ?? null;
};
