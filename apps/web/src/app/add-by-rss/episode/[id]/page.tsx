import { AddByRSSDetailPageClient } from '../../AddByRSSDetailPageClient';

type AddByRSSEpisodeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSEpisodeDetailPage({
  params,
}: AddByRSSEpisodeDetailPageProps) {
  const { id } = await params;

  return <AddByRSSDetailPageClient resourceType="episodes" idText={id} />;
}
