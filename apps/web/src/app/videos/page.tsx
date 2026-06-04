import { MainHeader } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('videos');
}

export default function VideosPage() {
  return (
    <>
      <MainHeader title="Videos" />
      <MainWrapper>
        <p>Coming Soon</p>
      </MainWrapper>
    </>
  );
}
