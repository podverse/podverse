import { getTranslations } from 'next-intl/server';

import { MainHeader } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('videos');
}

export default async function VideosPage() {
  const tMedia = await getTranslations('media');
  const tPlayer = await getTranslations('media_player');

  return (
    <>
      <MainHeader title={tMedia('video.videos')} />
      <MainWrapper>
        <p>{tPlayer('coming_soon')}</p>
      </MainWrapper>
    </>
  );
}
