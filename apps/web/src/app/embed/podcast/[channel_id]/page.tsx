import { EmbedTypedRoutePage } from '../../EmbedTypedRoutePage';

export type EmbedPodcastPageProps = {
  params: Promise<{ channel_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmbedPodcastPage({ params, searchParams }: EmbedPodcastPageProps) {
  const { channel_id } = await params;

  return (
    <EmbedTypedRoutePage routeKind="podcast" resourceId={channel_id} searchParams={searchParams} />
  );
}
