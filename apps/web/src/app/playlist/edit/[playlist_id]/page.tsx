import { notFound } from 'next/navigation';

import { buildNoindexMetadata } from '../../../../lib/seo/buildNoindexMetadata';
import { getSSRAuthService } from '../../../../utils/auth/ssrAuth';
import { PlaylistEditPageClient } from './PlaylistEditPageClient';

type PlaylistEditPageProps = {
  params: Promise<{ playlist_id: string }>;
};

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function PlaylistEditPage({ params }: PlaylistEditPageProps) {
  const { playlist_id } = await params;
  const { ssrApiRequestService } = await getSSRAuthService();

  let ssrPlaylist;
  try {
    ssrPlaylist = await ssrApiRequestService.reqPlaylistGet(playlist_id);
    if (!ssrPlaylist) {
      return notFound();
    }
  } catch {
    return notFound();
  }

  return <PlaylistEditPageClient ssrPlaylist={ssrPlaylist} />;
}
