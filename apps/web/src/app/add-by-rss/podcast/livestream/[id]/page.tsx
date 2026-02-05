import { AddByRSSDetailClient } from '../../../../../components/AddByRSS/Detail/AddByRSSDetailClient';

type AddByRSSPodcastLivestreamDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSPodcastLivestreamDetailPage({
  params,
}: AddByRSSPodcastLivestreamDetailPageProps) {
  const { id } = await params;

  return <AddByRSSDetailClient resourceType="livestreams" idText={id} />;
}
