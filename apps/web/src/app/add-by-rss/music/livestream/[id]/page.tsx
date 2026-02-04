import { AddByRSSDetailPageClient } from '../../../AddByRSSDetailPageClient';

type AddByRSSMusicLivestreamDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSMusicLivestreamDetailPage({
  params,
}: AddByRSSMusicLivestreamDetailPageProps) {
  const { id } = await params;

  return <AddByRSSDetailPageClient resourceType="livestreams" idText={id} />;
}
