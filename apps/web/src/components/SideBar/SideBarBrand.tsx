'use client';

import Link from 'next/link';
import React from 'react';

import { Image } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import {
  BRAND_RECTANGULAR_LOGO_WIDTH,
  getBrandLogoSrc,
  getBrandRectangularLogoImageHeight,
} from '../../utils/brandLogo';

import styles from '../../styles/components/SideBar/SideBarBrand.module.scss';

export const SideBarBrand: React.FC = () => {
  const config = useConfig();
  const { loggedInAccount } = useAccount();
  const { uiTheme } = useLocalSettings();
  const logoHeight = getBrandRectangularLogoImageHeight();

  return (
    <Link href={loggedInAccount ? ROUTES.HOME : ROUTES.BROWSE} className={styles.brand}>
      <Image
        src={getBrandLogoSrc(uiTheme)}
        alt={config.public.brand.name}
        width={BRAND_RECTANGULAR_LOGO_WIDTH}
        {...(logoHeight !== undefined ? { height: logoHeight } : {})}
        skipProxy
        priority
      />
    </Link>
  );
};
