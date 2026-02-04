import { AddByRSSDetailPageClient } from '../../AddByRSSDetailPageClient';

type AddByRSSPodcastDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSPodcastDetailPage({
  params,
}: AddByRSSPodcastDetailPageProps) {
  const { id } = await params;

  return <AddByRSSDetailPageClient resourceType="podcasts" idText={id} />;
}
