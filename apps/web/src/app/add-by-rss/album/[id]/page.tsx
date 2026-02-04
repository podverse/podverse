import { AddByRSSDetailPageClient } from '../../AddByRSSDetailPageClient';

type AddByRSSAlbumDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSAlbumDetailPage({ params }: AddByRSSAlbumDetailPageProps) {
  const { id } = await params;

  return <AddByRSSDetailPageClient resourceType="albums" idText={id} />;
}
