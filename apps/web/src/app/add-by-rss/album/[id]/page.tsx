import { AddByRSSDetailClient } from '../../../../components/AddByRSS/Detail/AddByRSSDetailClient';

type AddByRSSAlbumDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSAlbumDetailPage({ params }: AddByRSSAlbumDetailPageProps) {
  const { id } = await params;

  return <AddByRSSDetailClient resourceType="albums" idText={id} />;
}
