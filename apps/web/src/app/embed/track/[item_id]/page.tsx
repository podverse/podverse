import { EmbedTypedRoutePage } from '../../EmbedTypedRoutePage';

export type EmbedTrackPageProps = {
  params: Promise<{ item_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmbedTrackPage({ params, searchParams }: EmbedTrackPageProps) {
  const { item_id } = await params;

  return <EmbedTypedRoutePage routeKind="track" resourceId={item_id} searchParams={searchParams} />;
}
