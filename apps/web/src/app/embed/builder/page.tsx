import { getTranslations } from 'next-intl/server';

import { FormStack, MainColumnStack, MainHeader, MainSidebarLayout } from '@podverse/ui';

import { EmbedBuilderPanel } from '../../../components/embed/EmbedBuilderPanel';
import { EmbedBuilderSourceIntro } from '../../../components/embed/EmbedBuilderSourceIntro';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { fetchEmbedBuilderSourceIntro } from '../../../lib/embed/fetchEmbedBuilderSourceIntro';
import { parseEmbedBuilderQueryParams } from '../../../lib/embed/parseEmbedBuilderQueryParams';

type EmbedBuilderPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmbedBuilderPage({ searchParams }: EmbedBuilderPageProps) {
  const rawSearchParams = await searchParams;
  const initialParams = parseEmbedBuilderQueryParams(rawSearchParams);
  const sourceIntro = await fetchEmbedBuilderSourceIntro(initialParams);
  const t = await getTranslations('features');

  return (
    <>
      <MainHeader title={t('embed_builder')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <FormStack>
              {sourceIntro !== null ? <EmbedBuilderSourceIntro sourceIntro={sourceIntro} /> : null}
              <EmbedBuilderPanel initialParams={initialParams} />
            </FormStack>
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
