import { useCallback, useEffect, useState } from 'react';

import type { DTOChannel, DTOClip, DTOPlaylist } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../auth';
import { useAuth } from '../auth/AuthProvider';

const FIRST_PAGE = 1;

type ProfileContentBundle = {
  albums: DTOChannel[];
  clips: DTOClip[];
  playlists: DTOPlaylist[];
  podcasts: DTOChannel[];
};

type ProfileContentLoadState = {
  content: ProfileContentBundle;
  errorKey: string | null;
  isLoading: boolean;
};

const EMPTY_CONTENT: ProfileContentBundle = {
  albums: [],
  clips: [],
  playlists: [],
  podcasts: [],
};

export function usePublicProfileContentLoad(accountIdText: string) {
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [state, setState] = useState<ProfileContentLoadState>({
    content: EMPTY_CONTENT,
    errorKey: null,
    isLoading: true,
  });

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, errorKey: null, isLoading: true }));
    try {
      const account = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqAccountGetByIdText({ id_text: accountIdText })
      );
      setDisplayName(account.account_profile?.display_name ?? accountIdText);

      const [podcastsResponse, albumsResponse, playlistsResponse, clipsResponse] =
        await Promise.all([
          requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) =>
              api.reqProfilePodcastsAZ({
                account_id_text: accountIdText,
                page: FIRST_PAGE,
              })
          ),
          requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) =>
              api.reqProfileAlbumsAZ({
                account_id_text: accountIdText,
                page: FIRST_PAGE,
              })
          ),
          requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) =>
              api.reqProfilePlaylistsAZ({
                account_id_text: accountIdText,
                page: FIRST_PAGE,
              })
          ),
          requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) =>
              api.reqProfileClipsRecent({
                account_id_text: accountIdText,
                page: FIRST_PAGE,
              })
          ),
        ]);

      setState({
        content: {
          albums: albumsResponse.data,
          clips: clipsResponse.data,
          playlists: playlistsResponse.data,
          podcasts: podcastsResponse.data,
        },
        errorKey: null,
        isLoading: false,
      });
    } catch {
      setDisplayName(accountIdText);
      setState({
        content: EMPTY_CONTENT,
        errorKey: 'errors.generic',
        isLoading: false,
      });
    }
  }, [accessToken, accountIdText, clearSession, refreshToken, setTokens]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    content: state.content,
    displayName,
    errorKey: state.errorKey,
    isLoading: state.isLoading,
    reload,
  };
}

export function useMyProfileContentLoad() {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [state, setState] = useState<ProfileContentLoadState>({
    content: EMPTY_CONTENT,
    errorKey: null,
    isLoading: true,
  });

  const reload = useCallback(async () => {
    if (status !== 'authenticated') {
      setState({
        content: EMPTY_CONTENT,
        errorKey: null,
        isLoading: false,
      });
      return;
    }

    setState((prev) => ({ ...prev, errorKey: null, isLoading: true }));
    try {
      const [podcastsResponse, albumsResponse, playlistsResponse, clipsResponse] =
        await Promise.all([
          requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) =>
              api.reqMyProfilePodcastsAZ({
                page: FIRST_PAGE,
              })
          ),
          requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) =>
              api.reqMyProfileAlbumsAZ({
                page: FIRST_PAGE,
              })
          ),
          requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) =>
              api.reqMyProfilePlaylistsAZ({
                page: FIRST_PAGE,
              })
          ),
          requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) =>
              api.reqMyProfileClipsRecent({
                page: FIRST_PAGE,
              })
          ),
        ]);

      setState({
        content: {
          albums: albumsResponse.data,
          clips: clipsResponse.data,
          playlists: playlistsResponse.data,
          podcasts: podcastsResponse.data,
        },
        errorKey: null,
        isLoading: false,
      });
    } catch {
      setState({
        content: EMPTY_CONTENT,
        errorKey: 'errors.generic',
        isLoading: false,
      });
    }
  }, [accessToken, clearSession, refreshToken, setTokens, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    content: state.content,
    errorKey: state.errorKey,
    isLoading: state.isLoading,
    reload,
  };
}
