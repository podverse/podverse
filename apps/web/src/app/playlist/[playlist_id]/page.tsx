import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SharableStatusEnum } from '@podverse/helpers';

import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import { buildStaticPageMetadata } from '../../../lib/seo/buildStaticPageMetadata';
import { getPlaylistForSeoPage } from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { PlaylistPageClient } from './PlaylistPageClient';

export type PlaylistPageProps = {
  params: Promise<{ playlist_id: string }>;
};

const isPlaylistIndexable = (sharableStatusId: number): boolean => {
  // Public playlists are indexable. Unlisted/private remain noindex to prevent broad discovery.
  return sharableStatusId === SharableStatusEnum.Public;
};

export async function generateMetadata({ params }: PlaylistPageProps): Promise<Metadata> {
  try {
    const { playlist_id } = await params;
    const playlist = await getPlaylistForSeoPage(playlist_id);
    if (!playlist || !isPlaylistIndexable(playlist.sharable_status_id)) {
      return buildNoindexMetadata('Playlist');
    }

    return buildStaticPageMetadata({
      title: playlist.title?.trim() || 'Playlist',
      descriptionPlain: toSeoPlainText(playlist.description || 'Podverse playlist page'),
      pathname: `/playlist/${playlist.id_text}`,
    });
  } catch {
    return buildNoindexMetadata('Playlist');
  }
}

export default async function PlaylistPage({ params }: PlaylistPageProps) {
  const { playlist_id } = await params;

  let ssrPlaylist;
  try {
    ssrPlaylist = await getPlaylistForSeoPage(playlist_id);
    if (!ssrPlaylist) {
      return notFound();
    }
  } catch {
    return notFound();
  }

  return <PlaylistPageClient ssrPlaylist={ssrPlaylist} />;
}
