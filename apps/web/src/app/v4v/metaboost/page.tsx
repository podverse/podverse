import { getTranslations } from 'next-intl/server';

import { MainHeader } from '../../../components/Main/MainHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { SideContent } from '../../../components/SideContent/SideContent';
import { getConfig } from '../../../config';

import styles from '../../../styles/app/v4v/BoostMessages.module.scss';

export default async function MetaboostPage() {
  const t = await getTranslations('v4v');
  const config = getConfig();

  return (
    <>
      <MainHeader title={t('boost_messages.title')} />
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <section className={styles.page}>
              <p className={styles.paragraph}>{t('boost_messages.page_intro')}</p>
              <p className={styles.paragraph}>
                {t.rich('boost_messages.page_signup', {
                  brand_name: config.public.brand.name,
                  link: (chunks) => (
                    <a
                      href="https://metaboost.cc"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.inlineLink}
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
              <p className={styles.paragraph}>
                {t.rich('boost_messages.page_rss_tag', {
                  rssTag: (chunks) => (
                    <code className={styles.tagInline}>
                      {'<'}
                      {chunks}
                      {'>'}
                    </code>
                  ),
                })}
              </p>
              <p className={styles.paragraph}>
                {t('boost_messages.page_open_standard', { brand_name: config.public.brand.name })}
              </p>
              <nav className={styles.howToSection} aria-labelledby="metaboost-how-to-heading">
                <h2 id="metaboost-how-to-heading" className={styles.howToHeading}>
                  {t('boost_messages.page_how_to_heading')}
                </h2>
                <ul className={styles.howToList}>
                  <li>
                    <a
                      href="https://metaboost.cc/how-to/creators"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.inlineLink}
                    >
                      {t('boost_messages.page_how_to_creators')}
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://metaboost.cc/how-to/developers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.inlineLink}
                    >
                      {t('boost_messages.page_how_to_developers')}
                    </a>
                  </li>
                </ul>
              </nav>
            </section>
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
}
