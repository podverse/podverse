import { AddByRSSDetailPageClient } from '../../AddByRSSDetailPageClient';

type AddByRSSTrackDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSTrackDetailPage({ params }: AddByRSSTrackDetailPageProps) {
  const { id } = await params;

  return <AddByRSSDetailPageClient resourceType="tracks" idText={id} />;
}
