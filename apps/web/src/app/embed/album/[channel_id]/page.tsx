import { EmbedTypedRoutePage } from '../../EmbedTypedRoutePage';

export type EmbedAlbumPageProps = {
  params: Promise<{ channel_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmbedAlbumPage({ params, searchParams }: EmbedAlbumPageProps) {
  const { channel_id } = await params;

  return (
    <EmbedTypedRoutePage routeKind="album" resourceId={channel_id} searchParams={searchParams} />
  );
}
