import { EmbedTypedRoutePage } from '../../EmbedTypedRoutePage';

export type EmbedOfficialClipPageProps = {
  params: Promise<{ item_soundbite_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmbedOfficialClipPage({
  params,
  searchParams,
}: EmbedOfficialClipPageProps) {
  const { item_soundbite_id } = await params;

  return (
    <EmbedTypedRoutePage
      routeKind="official-clip"
      resourceId={item_soundbite_id}
      searchParams={searchParams}
    />
  );
}
