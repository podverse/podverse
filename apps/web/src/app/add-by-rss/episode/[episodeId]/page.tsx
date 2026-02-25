import { AddByRSSEpisodePageClient } from '../AddByRSSEpisodePageClient';

type AddByRSSEpisodeDetailPageProps = {
  params: Promise<{ episodeId: string }>;
};

export default async function AddByRSSEpisodeDetailPage({
  params,
}: AddByRSSEpisodeDetailPageProps) {
  const { episodeId } = await params;

  return <AddByRSSEpisodePageClient itemIdText={episodeId} />;
}
