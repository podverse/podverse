import { AddByRSSDetailClient } from '../../../../components/AddByRSS/Detail/AddByRSSDetailClient';

type AddByRSSPodcastDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSPodcastDetailPage({
  params,
}: AddByRSSPodcastDetailPageProps) {
  const { id } = await params;

  return <AddByRSSDetailClient resourceType="podcasts" idText={id} />;
}
