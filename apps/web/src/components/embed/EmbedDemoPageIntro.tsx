'use client';

import { useTranslations } from 'next-intl';
import { FaShare } from 'react-icons/fa6';

import { useConfig } from '../../contexts/Config';
import styles from '../../app/embed/EmbedIndexPage.module.scss';

type EmbedDemoPageIntroProps = {
  configuredCount: number;
};

export function EmbedDemoPageIntro({ configuredCount }: EmbedDemoPageIntroProps) {
  const config = useConfig();
  const t = useTranslations('features');

  return (
    <>
      <p className={styles.lead}>
        {t.rich('embed_demo_page_lead', {
          brand_name: config.public.brand.name,
          shareIcon: () => (
            <span aria-hidden="true" className={styles.shareIconInline}>
              <FaShare />
            </span>
          ),
        })}
      </p>
      {configuredCount > 0 ? (
        <p className={styles.intro}>{t('embed_demo_page_examples_intro')}</p>
      ) : (
        <p className={styles.intro}>{t('embed_demo_page_not_configured')}</p>
      )}
    </>
  );
}
