import { EmbedTypedRoutePage } from '../../EmbedTypedRoutePage';

export type EmbedEpisodePageProps = {
  params: Promise<{ item_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmbedEpisodePage({ params, searchParams }: EmbedEpisodePageProps) {
  const { item_id } = await params;

  return (
    <EmbedTypedRoutePage routeKind="episode" resourceId={item_id} searchParams={searchParams} />
  );
}
