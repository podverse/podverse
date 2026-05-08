'use client';

import Link from 'next/link';
import React from 'react';

import { Image } from '@podverse/ui';

import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { getBrandLogoSrc } from '../../utils/brandLogo';

import styles from '../../styles/components/SideBar/SideBarBrand.module.scss';

export const SideBarBrand: React.FC = () => {
  const config = useConfig();
  const { uiTheme } = useLocalSettings();

  return (
    <Link href="/" className={styles.brand}>
      <Image
        src={getBrandLogoSrc(uiTheme)}
        alt={config.public.brand.name}
        width={144}
        height={25}
        skipProxy
        priority
      />
    </Link>
  );
};
