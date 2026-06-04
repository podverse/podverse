'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { FaDiscord, FaGithub, FaMastodon, FaXTwitter } from 'react-icons/fa6';
import { SiMatrix } from 'react-icons/si';

import {
  FooterBrand,
  FooterCopyright,
  FooterLayout,
  FooterLinks,
  FooterSocialLinks,
} from '@podverse/ui';

import { LINKS } from '../../constants/links';
import { ROUTES } from '../../constants/routes';
import { SOCIALS } from '../../constants/socials';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { getBrandLogoSrc } from '../../utils/brandLogo';
import { Link } from '../Link/Link';

export const Footer: React.FC = () => {
  const config = useConfig();
  const { uiTheme } = useLocalSettings();
  const tMisc = useTranslations('misc');
  const tInfo = useTranslations('info');
  const tMembership = useTranslations('membership');
  const tFeatures = useTranslations('features');
  const tSocials = useTranslations('socials');
  const tContact = useTranslations('contact');

  return (
    <FooterLayout
      top={
        <>
          <FooterBrand
            alt={config.public.brand.name}
            LinkComponent={NextLink}
            logoSrc={getBrandLogoSrc(uiTheme)}
            skipProxy
          />
          <FooterCopyright
            href={LINKS.opensourceLicense}
            label={tMisc('open_source')}
            LinkComponent={NextLink}
          />
        </>
      }
      links={
        <FooterLinks>
          <Link href={ROUTES.CONTACT}>{tContact('contact')}</Link>
          <Link href={ROUTES.ABOUT}>{tInfo('about')}</Link>
          <Link href={ROUTES.DONATE}>{tMisc('donate')}</Link>
          <Link href={ROUTES.TERMS}>{tMisc('terms')}</Link>
          <Link href={ROUTES.MEMBERSHIP}>{tMembership('premium')}</Link>
          {/* <Link disabled href={ROUTES.MOBILE_APP}>{tMisc("mobile")}</Link> */}
          <Link disabled href={ROUTES.EMBED}>
            {tFeatures('embed')}
          </Link>
        </FooterLinks>
      }
      social={
        <FooterSocialLinks>
          <Link
            href={SOCIALS.DISCORD}
            color="secondary"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tSocials('discord')}
          >
            <FaDiscord />
          </Link>
          <Link
            href={SOCIALS.ACTIVITY_PUB}
            color="secondary"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tSocials('mastodon')}
          >
            <FaMastodon />
          </Link>
          <Link
            href={SOCIALS.X}
            color="secondary"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tSocials('x')}
          >
            <FaXTwitter />
          </Link>
          <Link
            href={SOCIALS.MATRIX}
            color="secondary"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tSocials('matrix')}
          >
            <SiMatrix />
          </Link>
          <Link
            href={SOCIALS.GITHUB}
            color="secondary"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tSocials('github')}
          >
            <FaGithub />
          </Link>
        </FooterSocialLinks>
      }
    />
  );
};
