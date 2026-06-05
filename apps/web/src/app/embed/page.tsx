import { MainHeader } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default function EmbedPage() {
  return (
    <>
      <MainHeader title="Embed" />
      <MainWrapper>
        <p>Coming Soon</p>
      </MainWrapper>
    </>
  );
}
