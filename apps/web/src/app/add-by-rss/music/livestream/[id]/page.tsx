import { AddByRSSDetailClient } from '../../../../../components/AddByRSS/Detail/AddByRSSDetailClient';

type AddByRSSMusicLivestreamDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSMusicLivestreamDetailPage({
  params,
}: AddByRSSMusicLivestreamDetailPageProps) {
  const { id } = await params;

  return <AddByRSSDetailClient resourceType="livestreams" idText={id} />;
}
