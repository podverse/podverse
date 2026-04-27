import { getConfig } from '../config';
import type { UITheme } from './localSettings/uiTheme';

export const getBrandLogoSrc = (uiTheme: UITheme) => {
  const { brand } = getConfig().public;
  switch (uiTheme) {
    case 'light':
      return brand.logoLight;
    case 'dark':
    case 'dracula':
    default:
      return brand.logoDark;
  }
};
