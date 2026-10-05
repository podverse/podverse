import { getTranslations } from 'next-intl/server';

import { MainColumnStack, MainHeader, MainSidebarLayout, SideContent } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';
import { AboutPageClient } from './AboutPageClient';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('about');
}

export default async function AboutPage() {
  const t = await getTranslations('about');

  return (
    <>
      <MainHeader title={t('title')} />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <AboutPageClient />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
