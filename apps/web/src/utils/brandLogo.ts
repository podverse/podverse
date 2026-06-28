import { getConfig } from '../config';
import type { UITheme } from './localSettings/uiTheme';

/** Layout width for navbar, sidebar, and footer rectangular wordmarks. */
export const BRAND_RECTANGULAR_LOGO_WIDTH = 144;

/** Default height when layout expects a 144×25 wordmark. */
export const BRAND_RECTANGULAR_LOGO_HEIGHT = 25;

/** Returns fixed height for brand `<Image>` unless env disables height enforcement. */
export const getBrandRectangularLogoImageHeight = (): number | undefined => {
  if (getConfig().public.brand.rectangularLogoDisableHeightEnforcement) {
    return undefined;
  }
  return BRAND_RECTANGULAR_LOGO_HEIGHT;
};

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
