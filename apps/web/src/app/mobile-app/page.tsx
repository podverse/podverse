import { getTranslations } from 'next-intl/server';

import { MainHeader } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('mobileApp');
}

export default async function MobileAppPage() {
  const tSeo = await getTranslations('seo');
  const tPlayer = await getTranslations('media_player');

  return (
    <>
      <MainHeader title={tSeo('pages.mobileApp.title')} />
      <MainWrapper>
        <p>{tPlayer('coming_soon')}</p>
      </MainWrapper>
    </>
  );
}
