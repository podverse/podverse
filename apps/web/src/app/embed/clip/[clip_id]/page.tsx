import { EmbedTypedRoutePage } from '../../EmbedTypedRoutePage';

export type EmbedClipPageProps = {
  params: Promise<{ clip_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmbedClipPage({ params, searchParams }: EmbedClipPageProps) {
  const { clip_id } = await params;

  return <EmbedTypedRoutePage routeKind="clip" resourceId={clip_id} searchParams={searchParams} />;
}
