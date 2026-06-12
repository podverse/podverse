import { EmbedBuilderPanel } from '../../../components/embed/EmbedBuilderPanel';
import { parseEmbedBuilderQueryParams } from '../../../lib/embed/parseEmbedBuilderQueryParams';

type EmbedBuilderPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmbedBuilderPage({ searchParams }: EmbedBuilderPageProps) {
  const rawSearchParams = await searchParams;
  const initialParams = parseEmbedBuilderQueryParams(rawSearchParams);

  return <EmbedBuilderPanel initialParams={initialParams} />;
}
