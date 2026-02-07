import { AddByRSSLivestreamItemPageClient } from '../../../livestream/AddByRSSLivestreamItemPageClient';

type AddByRSSMusicLivestreamDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSMusicLivestreamDetailPage({
  params,
}: AddByRSSMusicLivestreamDetailPageProps) {
  const { id } = await params;

  return <AddByRSSLivestreamItemPageClient itemIdText={id} mediumSlug="music" />;
}
