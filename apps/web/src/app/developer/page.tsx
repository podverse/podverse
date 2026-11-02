import { getTranslations } from 'next-intl/server';

import { MainColumnStack, MainHeader, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';
import { DeveloperPageClient } from './DeveloperPageClient';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('developer');
}

export default async function DeveloperPage() {
  const t = await getTranslations('settings');

  return (
    <>
      <MainHeader title={t('developer.developer')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <DeveloperPageClient />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
