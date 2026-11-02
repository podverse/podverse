import { getTranslations } from 'next-intl/server';

import { MainColumnStack, MainHeader, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';
import { FaqPageClient } from './FaqPageClient';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('faq');
}

export default async function FaqPage() {
  const t = await getTranslations('misc');

  return (
    <>
      <MainHeader title={t('faq')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <FaqPageClient />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
