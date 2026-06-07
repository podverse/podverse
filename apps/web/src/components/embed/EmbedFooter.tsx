'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';

import { FooterBrand, FooterCopyright } from '@podverse/ui';

import { LINKS } from '../../constants/links';
import { ROUTES } from '../../constants/routes';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { getBrandLogoSrc } from '../../utils/brandLogo';
import { Link } from '../Link/Link';

import styles from '../../styles/components/embed/EmbedFooter.module.scss';

export function EmbedFooter() {
  const config = useConfig();
  const { uiTheme } = useLocalSettings();
  const tInfo = useTranslations('info');
  const tMisc = useTranslations('misc');

  return (
    <footer className={styles.footer} data-testid="embed-footer">
      <FooterBrand
        alt={config.public.brand.name}
        LinkComponent={NextLink}
        logoSrc={getBrandLogoSrc(uiTheme)}
        skipProxy
      />
      <Link className={styles.aboutLink} href={ROUTES.ABOUT} target="_blank" rel="noopener noreferrer">
        {tInfo('about')}
      </Link>
      <FooterCopyright
        className={styles.openSourceLink}
        href={LINKS.opensourceLicense}
        label={tMisc('open_source')}
        LinkComponent={NextLink}
      />
    </footer>
  );
}
