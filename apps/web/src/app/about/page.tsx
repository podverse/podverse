import { getTranslations } from 'next-intl/server';

import { Image, MainColumnStack, MainHeader, MainSidebarLayout, SideContent } from '@podverse/ui';

import { FeatureComparison } from '../../components/FeatureComparison/FeatureComparison';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { getConfig } from '../../config';
import { FEATURES } from '../../constants/features';
import { IMAGES } from '../../constants/images';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';

import styles from '../../styles/app/about/About.module.scss';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('about');
}

export default async function AboutPage() {
  const t = await getTranslations('about');
  const config = getConfig();

  return (
    <>
      <MainHeader title={t('title')} />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <section className={styles.intro}>
              <p>{t('intro_text', { brand_name: config.public.brand.name })}</p>
            </section>

            <section className={styles.downloadButtons}>
              <a href="#" className={styles.downloadButton} aria-label={t('download_app_store')}>
                <Image
                  alt=""
                  className={styles.downloadButtonImageDesktop}
                  height={IMAGES.MOBILE.APP_STORES.DESKTOP.HEIGHT}
                  skipProxy
                  src={IMAGES.MOBILE.APP_STORES.DESKTOP.APP_STORE}
                  width={IMAGES.MOBILE.APP_STORES.DESKTOP.WIDTH}
                />
                <Image
                  alt=""
                  className={styles.downloadButtonImageMobile}
                  height={IMAGES.MOBILE.APP_STORES.MOBILE.HEIGHT}
                  skipProxy
                  src={IMAGES.MOBILE.APP_STORES.MOBILE.APP_STORE}
                  width={IMAGES.MOBILE.APP_STORES.MOBILE.WIDTH}
                />
              </a>
              <a href="#" className={styles.downloadButton} aria-label={t('download_google_play')}>
                <Image
                  alt=""
                  className={styles.downloadButtonImageDesktop}
                  height={IMAGES.MOBILE.APP_STORES.DESKTOP.HEIGHT}
                  skipProxy
                  src={IMAGES.MOBILE.APP_STORES.DESKTOP.GOOGLE_PLAY}
                  width={IMAGES.MOBILE.APP_STORES.DESKTOP.WIDTH}
                />
                <Image
                  alt=""
                  className={styles.downloadButtonImageMobile}
                  height={IMAGES.MOBILE.APP_STORES.MOBILE.HEIGHT}
                  skipProxy
                  src={IMAGES.MOBILE.APP_STORES.MOBILE.GOOGLE_PLAY}
                  width={IMAGES.MOBILE.APP_STORES.MOBILE.WIDTH}
                />
              </a>
              <a href="#" className={styles.downloadButton} aria-label={t('download_f_droid')}>
                <Image
                  alt=""
                  className={styles.downloadButtonImageDesktop}
                  height={IMAGES.MOBILE.APP_STORES.DESKTOP.HEIGHT}
                  skipProxy
                  src={IMAGES.MOBILE.APP_STORES.DESKTOP.F_DROID}
                  width={IMAGES.MOBILE.APP_STORES.DESKTOP.WIDTH}
                />
                <Image
                  alt=""
                  className={styles.downloadButtonImageMobile}
                  height={IMAGES.MOBILE.APP_STORES.MOBILE.HEIGHT}
                  skipProxy
                  src={IMAGES.MOBILE.APP_STORES.MOBILE.F_DROID}
                  width={IMAGES.MOBILE.APP_STORES.MOBILE.WIDTH}
                />
              </a>
            </section>

            <section className={styles.licensing}>
              <p>{t('licensing_text', { brand_name: config.public.brand.name })}</p>
            </section>

            <section className={styles.featuresSection}>
              <h2 className={styles.comparisonTitle}>{t('features_title')}</h2>
              <FeatureComparison features={FEATURES} />
            </section>
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
