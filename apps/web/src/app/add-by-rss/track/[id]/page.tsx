import { AddByRSSTrackItemPageClient } from '../AddByRSSTrackItemPageClient';

type AddByRSSTrackItemDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSTrackItemDetailPage({
  params,
}: AddByRSSTrackItemDetailPageProps) {
  const { id } = await params;

  return <AddByRSSTrackItemPageClient itemIdText={id} />;
}
