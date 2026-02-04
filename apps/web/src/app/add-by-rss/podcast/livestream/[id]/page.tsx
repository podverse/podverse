import { AddByRSSDetailPageClient } from '../../../AddByRSSDetailPageClient';

type AddByRSSPodcastLivestreamDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSPodcastLivestreamDetailPage({
  params,
}: AddByRSSPodcastLivestreamDetailPageProps) {
  const { id } = await params;

  return <AddByRSSDetailPageClient resourceType="livestreams" idText={id} />;
}
