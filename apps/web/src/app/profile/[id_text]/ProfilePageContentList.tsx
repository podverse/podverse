'use client';

import React from 'react';

import { CorePodcasts } from '../../../components/Core/Podcast/CorePodcasts';
import { ListClips } from '../../../components/List/Clips/ListClips';
import { ListAlbums } from '../../../components/List/Music/Albums/ListAlbums';
import { ListPlaylists } from '../../../components/List/Playlists/ListPlaylists';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { NoResults } from '../../../components/NoResults/NoResults';
import { useProfilePageContentContext } from './ProfilePageContentContext';

import styles from '../../../styles/app/profile/ProfileContentList.module.scss';

export const ProfilePageContentList: React.FC = () => {
  const {
    selectedTab,
    podcasts,
    podcastsPage,
    setPodcastsPage,
    podcastsTotalPages,
    podcastsLoaded,
    albums,
    albumsPage,
    setAlbumsPage,
    albumsTotalPages,
    albumsLoaded,
    playlists,
    playlistsPage,
    setPlaylistsPage,
    playlistsTotalPages,
    playlistsLoaded,
    clips,
    clipsPage,
    setClipsPage,
    clipsTotalPages,
    clipsLoaded,
    isLoading,
  } = useProfilePageContentContext();

  if (selectedTab === 'podcasts') {
    // Show loading spinner if currently loading and data hasn't been loaded yet
    if (isLoading && !podcastsLoaded) {
      return <WebLoadingSpinnerOverlay isLoading />;
    }

    // Show no results only if data has been loaded and there are no results
    const showNoResults =
      podcastsLoaded && !isLoading && podcastsPage <= 1 && podcasts.length === 0;

    if (showNoResults) {
      return <NoResults />;
    }

    return (
      <>
        <CorePodcasts
          page={podcastsPage}
          setPage={setPodcastsPage}
          channels={podcasts}
          totalPages={podcastsTotalPages}
          showSubscribeMessage={false}
          type="global"
          category={null}
          viewSelected="rows"
        />
        <WebLoadingSpinnerOverlay isLoading={isLoading && podcastsLoaded} />
      </>
    );
  }

  if (selectedTab === 'albums') {
    // Show loading spinner if currently loading and data hasn't been loaded yet
    if (isLoading && !albumsLoaded) {
      return <WebLoadingSpinnerOverlay isLoading />;
    }

    // Show no results only if data has been loaded and there are no results
    const showNoResults = albumsLoaded && !isLoading && albumsPage <= 1 && albums.length === 0;

    if (showNoResults) {
      return <NoResults />;
    }

    return (
      <>
        <ListAlbums
          page={albumsPage}
          setPage={setAlbumsPage}
          channels={albums}
          totalPages={albumsTotalPages}
          showSubscribeMessage={false}
          type="global"
          viewSelected="rows"
        />
        <WebLoadingSpinnerOverlay isLoading={isLoading && albumsLoaded} />
      </>
    );
  }

  if (selectedTab === 'playlists') {
    // Show loading spinner if currently loading and data hasn't been loaded yet
    if (isLoading && !playlistsLoaded) {
      return <WebLoadingSpinnerOverlay isLoading />;
    }

    // Show no results only if data has been loaded and there are no results
    const showNoResults =
      playlistsLoaded && !isLoading && playlistsPage <= 1 && playlists.length === 0;

    if (showNoResults) {
      return <NoResults />;
    }

    return (
      <>
        <ListPlaylists
          page={playlistsPage}
          setPage={setPlaylistsPage}
          playlists={playlists}
          totalPages={playlistsTotalPages}
          showLoginMessage={false}
          showCreator={false}
        />
        <WebLoadingSpinnerOverlay isLoading={isLoading && playlistsLoaded} />
      </>
    );
  }

  if (selectedTab === 'clips') {
    // Show loading spinner if currently loading and data hasn't been loaded yet
    if (isLoading && !clipsLoaded) {
      return <WebLoadingSpinnerOverlay isLoading />;
    }

    // Show no results only if data has been loaded and there are no results
    const showNoResults = clipsLoaded && !isLoading && clipsPage <= 1 && clips.length === 0;

    if (showNoResults) {
      return <NoResults />;
    }

    return (
      <>
        <div className={styles.clipsWrapper}>
          <ListClips
            page={clipsPage}
            setPage={setClipsPage}
            clips={clips}
            totalPages={clipsTotalPages}
            showSubscribeMessage={false}
            showItemInfo={true}
          />
        </div>
        <WebLoadingSpinnerOverlay isLoading={isLoading && clipsLoaded} />
      </>
    );
  }

  return null;
};
