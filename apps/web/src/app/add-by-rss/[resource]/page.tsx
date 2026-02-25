import { notFound } from 'next/navigation';
import { AddByRSSListClient } from '../../../components/AddByRSS/List/AddByRSSListClient';
import type { AddByRSSResourceType } from '../../../utils/addByRSS/types';

const RESOURCE_TYPES: AddByRSSResourceType[] = [
  'podcasts',
  'episodes',
  'artists',
  'albums',
  'tracks',
  'livestreams',
];

type AddByRSSResourcePageProps = {
  params: Promise<{ resource: string }>;
};

const isAddByRSSResourceType = (resource: string): resource is AddByRSSResourceType =>
  RESOURCE_TYPES.includes(resource as AddByRSSResourceType);

export default async function AddByRSSResourcePage({ params }: AddByRSSResourcePageProps) {
  const { resource } = await params;

  if (!isAddByRSSResourceType(resource)) {
    notFound();
  }

  return <AddByRSSListClient resourceType={resource} />;
}
