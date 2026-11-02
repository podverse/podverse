import { getTranslations } from 'next-intl/server';

import { MainColumnStack, MainHeader, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';
import { AboutPageClient } from './AboutPageClient';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('about');
}

/**
 * The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.The About page.
 */

export default async function AboutPage() {
  const t = await getTranslations('about');

  return (
    <>
      <MainHeader title={t('title')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <AboutPageClient />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
