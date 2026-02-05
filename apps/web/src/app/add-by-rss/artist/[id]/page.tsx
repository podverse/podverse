import { AddByRSSArtistPageClient } from '../AddByRSSArtistPageClient';

type AddByRSSArtistDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSArtistDetailPage({ params }: AddByRSSArtistDetailPageProps) {
  const { id } = await params;

  return <AddByRSSArtistPageClient idText={id} />;
}
