import { AddByRSSCredentialsPageClient } from '../AddByRSSCredentialsPageClient';

type AddByRSSCredentialsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddByRSSCredentialsPage({ params }: AddByRSSCredentialsPageProps) {
  const { id } = await params;

  return <AddByRSSCredentialsPageClient idText={id} />;
}
