import { notFound } from 'next/navigation';
import { AddByRSSDetailClient } from '../../AddByRSSDetailClient';
import type { AddByRSSResourceType } from '../../../../utils/addByRSS/types';

const RESOURCE_TYPES: AddByRSSResourceType[] = [
  'podcasts',
  'episodes',
  'artists',
  'albums',
  'tracks',
  'livestreams',
];

type AddByRSSDetailPageProps = {
  params: Promise<{ resource: string; id_text: string }>;
};

const isAddByRSSResourceType = (resource: string): resource is AddByRSSResourceType =>
  RESOURCE_TYPES.includes(resource as AddByRSSResourceType);

export default async function AddByRSSDetailPage({ params }: AddByRSSDetailPageProps) {
  const { resource, id_text: idText } = await params;

  if (!isAddByRSSResourceType(resource)) {
    notFound();
  }

  return <AddByRSSDetailClient resourceType={resource} idText={idText} />;
}
