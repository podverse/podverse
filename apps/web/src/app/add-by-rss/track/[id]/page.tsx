import { AddByRSSDetailClient } from '../../../../components/AddByRSS/Detail/AddByRSSDetailClient';

type AddByRSSTrackDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSTrackDetailPage({ params }: AddByRSSTrackDetailPageProps) {
  const { id } = await params;

  return <AddByRSSDetailClient resourceType="tracks" idText={id} />;
}
