'use client';

import React from 'react';

import { Image } from '@podverse/ui';

import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { getBrandLogoSrc } from '../../utils/brandLogo';

export const NavBarBrand: React.FC = () => {
  const config = useConfig();
  const { uiTheme } = useLocalSettings();

  return (
    <Image
      alt={config.public.brand.name}
      height={25}
      priority
      skipProxy
      src={getBrandLogoSrc(uiTheme)}
      width={144}
    />
  );
};
