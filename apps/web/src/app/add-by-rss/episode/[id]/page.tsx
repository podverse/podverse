import { AddByRSSEpisodePageClient } from '../AddByRSSEpisodePageClient';

type AddByRSSEpisodeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSEpisodeDetailPage({
  params,
}: AddByRSSEpisodeDetailPageProps) {
  const { id } = await params;

  return <AddByRSSEpisodePageClient itemGuid={id} />;
}
