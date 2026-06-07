import { EmbedTypedRoutePage } from '../../EmbedTypedRoutePage';

export type EmbedChapterPageProps = {
  params: Promise<{ item_chapter_id_text: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmbedChapterPage({ params, searchParams }: EmbedChapterPageProps) {
  const { item_chapter_id_text } = await params;

  return (
    <EmbedTypedRoutePage
      routeKind="chapter"
      resourceId={item_chapter_id_text}
      searchParams={searchParams}
    />
  );
}
