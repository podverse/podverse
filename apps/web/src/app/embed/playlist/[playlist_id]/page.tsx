import { EmbedTypedRoutePage } from '../../EmbedTypedRoutePage';

export type EmbedPlaylistPageProps = {
  params: Promise<{ playlist_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmbedPlaylistPage({ params, searchParams }: EmbedPlaylistPageProps) {
  const { playlist_id } = await params;

  return (
    <EmbedTypedRoutePage
      routeKind="playlist"
      resourceId={playlist_id}
      searchParams={searchParams}
    />
  );
}
