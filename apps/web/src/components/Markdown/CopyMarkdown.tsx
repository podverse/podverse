'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type {
  CopyMarkdownComponentKey,
  CopyMarkdownImageKey,
  CopyMarkdownInlineSpan,
} from '@podverse/helpers';
import {
  getSafeLinkHref,
  MEMBERSHIP_COMPARISON_FEATURES,
  parseCopyMarkdown,
} from '@podverse/helpers';
import { Image } from '@podverse/ui';

import { TrialLimitationsCollapsible } from '../../app/membership/TrialLimitationsCollapsible';
import { IMAGES } from '../../constants/images';
import { FeatureComparison } from '../FeatureComparison/FeatureComparison';
import { Link } from '../Link/Link';

import aboutStyles from '../../styles/app/about/About.module.scss';
import styles from './CopyMarkdown.module.scss';

type CopyMarkdownProps = {
  markdown: string;
  surface?: 'web' | 'mobile';
  renderComponent?: (key: CopyMarkdownComponentKey) => ReactNode;
};

const STORE_BADGE_SRC: Record<
  CopyMarkdownImageKey,
  {
    desktop: string;
    mobile: string;
    labelKey: 'download_app_store' | 'download_google_play' | 'download_f_droid';
  }
> = {
  app_store: {
    desktop: IMAGES.MOBILE.APP_STORES.DESKTOP.APP_STORE,
    mobile: IMAGES.MOBILE.APP_STORES.MOBILE.APP_STORE,
    labelKey: 'download_app_store',
  },
  google_play: {
    desktop: IMAGES.MOBILE.APP_STORES.DESKTOP.GOOGLE_PLAY,
    mobile: IMAGES.MOBILE.APP_STORES.MOBILE.GOOGLE_PLAY,
    labelKey: 'download_google_play',
  },
  f_droid: {
    desktop: IMAGES.MOBILE.APP_STORES.DESKTOP.F_DROID,
    mobile: IMAGES.MOBILE.APP_STORES.MOBILE.F_DROID,
    labelKey: 'download_f_droid',
  },
};

function defaultRenderComponent(key: CopyMarkdownComponentKey): ReactNode {
  if (key === 'feature_comparison') {
    return (
      <section className={aboutStyles.featuresSection}>
        <FeatureComparison features={MEMBERSHIP_COMPARISON_FEATURES} />
        <TrialLimitationsCollapsible />
      </section>
    );
  }
  return null;
}

function InlineSpans({
  spans,
  blockIndex,
  itemIndex,
}: {
  spans: CopyMarkdownInlineSpan[];
  blockIndex: number;
  itemIndex?: number;
}) {
  return (
    <>
      {spans.map((span, spanIndex) => {
        const key =
          itemIndex === undefined
            ? `span-${blockIndex}-${spanIndex}`
            : `span-${blockIndex}-${itemIndex}-${spanIndex}`;
        if (span.type === 'link') {
          return (
            <Link href={span.href} key={key}>
              {span.text}
            </Link>
          );
        }
        if (span.type === 'strong') {
          return <strong key={key}>{span.text}</strong>;
        }
        return <span key={key}>{span.text}</span>;
      })}
    </>
  );
}

export function CopyMarkdown({
  markdown,
  surface,
  renderComponent = defaultRenderComponent,
}: CopyMarkdownProps) {
  const tAbout = useTranslations('about');
  const blocks = parseCopyMarkdown(markdown, surface !== undefined ? { surface } : {});
  const nodes: ReactNode[] = [];
  let imageGroup: { key: CopyMarkdownImageKey; href: string }[] = [];

  const flushImages = (groupKey: string) => {
    if (imageGroup.length === 0) {
      return;
    }
    const group = imageGroup;
    imageGroup = [];
    nodes.push(
      <section className={aboutStyles.downloadButtons} key={groupKey}>
        {group.map((image, index) => {
          const badge = STORE_BADGE_SRC[image.key];
          const href = getSafeLinkHref(image.href) ?? '#';
          return (
            <a
              aria-label={tAbout(badge.labelKey)}
              className={aboutStyles.downloadButton}
              href={href}
              key={`${image.key}-${index}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Image
                alt=""
                className={aboutStyles.downloadButtonImageDesktop}
                height={IMAGES.MOBILE.APP_STORES.DESKTOP.HEIGHT}
                skipProxy
                src={badge.desktop}
                width={IMAGES.MOBILE.APP_STORES.DESKTOP.WIDTH}
              />
              <Image
                alt=""
                className={aboutStyles.downloadButtonImageMobile}
                height={IMAGES.MOBILE.APP_STORES.MOBILE.HEIGHT}
                skipProxy
                src={badge.mobile}
                width={IMAGES.MOBILE.APP_STORES.MOBILE.WIDTH}
              />
            </a>
          );
        })}
      </section>
    );
  };

  blocks.forEach((block, blockIndex) => {
    if (block.type === 'image') {
      imageGroup.push({ key: block.key, href: block.href });
      return;
    }

    flushImages(`images-before-${blockIndex}`);

    if (block.type === 'heading') {
      if (block.level === 1) {
        nodes.push(<h2 key={`heading-${blockIndex}`}>{block.text}</h2>);
      } else {
        nodes.push(<h3 key={`heading-${blockIndex}`}>{block.text}</h3>);
      }
      return;
    }

    if (block.type === 'list') {
      nodes.push(
        <ul key={`list-${blockIndex}`}>
          {block.items.map((item, itemIndex) => (
            <li key={`item-${blockIndex}-${itemIndex}`}>
              <InlineSpans blockIndex={blockIndex} itemIndex={itemIndex} spans={item} />
            </li>
          ))}
        </ul>
      );
      return;
    }

    if (block.type === 'component') {
      nodes.push(
        <div key={`component-${block.key}-${blockIndex}`}>{renderComponent(block.key)}</div>
      );
      return;
    }

    nodes.push(
      <p key={`paragraph-${blockIndex}`}>
        <InlineSpans blockIndex={blockIndex} spans={block.spans} />
      </p>
    );
  });

  flushImages('images-trailing');

  return <div className={styles.prose}>{nodes}</div>;
}
