import { AddByRSSLivestreamItemPageClient } from '../../../livestream/AddByRSSLivestreamItemPageClient';

type AddByRSSPodcastLivestreamDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSPodcastLivestreamDetailPage({
  params,
}: AddByRSSPodcastLivestreamDetailPageProps) {
  const { id } = await params;

  return <AddByRSSLivestreamItemPageClient itemIdText={id} mediumSlug="podcast" />;
}
