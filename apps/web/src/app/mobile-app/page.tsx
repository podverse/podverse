import { MainHeader } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('mobileApp');
}

export default function MobileAppPage() {
  return (
    <>
      <MainHeader title="Mobile App" />
      <MainWrapper>
        <p>Coming Soon</p>
      </MainWrapper>
    </>
  );
}
