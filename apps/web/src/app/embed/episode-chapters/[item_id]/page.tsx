import { EmbedTypedRoutePage } from '../../EmbedTypedRoutePage';

export type EmbedEpisodeChaptersPageProps = {
  params: Promise<{ item_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmbedEpisodeChaptersPage({
  params,
  searchParams,
}: EmbedEpisodeChaptersPageProps) {
  const { item_id } = await params;

  return (
    <EmbedTypedRoutePage
      routeKind="episode-chapters"
      resourceId={item_id}
      searchParams={searchParams}
    />
  );
}
