import { getTranslations } from 'next-intl/server';

import { MainColumnStack, MainHeader, MainSidebarLayout, SideContent } from '@podverse/ui';

import { TermsDocument } from '../../components/Legal/TermsDocument';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('terms');
}

export default async function TermsPage() {
  const t = await getTranslations('terms');

  return (
    <>
      <MainHeader title={t('terms')} />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <TermsDocument />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
