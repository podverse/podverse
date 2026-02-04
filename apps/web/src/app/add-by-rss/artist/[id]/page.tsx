import { AddByRSSDetailPageClient } from '../../AddByRSSDetailPageClient';

type AddByRSSArtistDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSArtistDetailPage({ params }: AddByRSSArtistDetailPageProps) {
  const { id } = await params;

  return <AddByRSSDetailPageClient resourceType="artists" idText={id} />;
}
