'use client';

import { useTranslations } from 'next-intl';
import { FaShare } from 'react-icons/fa6';

import styles from '../../app/embed/EmbedIndexPage.module.scss';

export function EmbedDemoPageIntro() {
  const t = useTranslations('features');

  return (
    <>
      <p className={styles.lead}>
        {t.rich('embed_demo_page_lead', {
          shareIcon: () => (
            <span aria-hidden="true" className={styles.shareIconInline}>
              <FaShare />
            </span>
          ),
        })}
      </p>
      <p className={styles.intro}>{t('embed_demo_page_examples_intro')}</p>
    </>
  );
}
