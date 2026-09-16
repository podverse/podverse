import { MainHeader } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default function MyClipsPage() {
  return (
    <>
      <MainHeader title="My clips" />
      <MainWrapper>
        <p>Coming soon</p>
      </MainWrapper>
    </>
  );
}
