'use client';

import React from 'react';

import { Image } from '@podverse/ui';

import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import {
  BRAND_RECTANGULAR_LOGO_WIDTH,
  getBrandLogoSrc,
  getBrandRectangularLogoImageHeight,
} from '../../utils/brandLogo';

export const NavBarBrand: React.FC = () => {
  const config = useConfig();
  const { uiTheme } = useLocalSettings();
  const logoHeight = getBrandRectangularLogoImageHeight();

  return (
    <Image
      alt={config.public.brand.name}
      {...(logoHeight !== undefined ? { height: logoHeight } : {})}
      priority
      skipProxy
      src={getBrandLogoSrc(uiTheme)}
      width={BRAND_RECTANGULAR_LOGO_WIDTH}
    />
  );
};
