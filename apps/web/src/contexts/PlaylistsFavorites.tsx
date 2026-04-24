import type { ReactNode } from 'react';
import { createContext, useEffect, useState } from 'react';
import { useContext } from 'react';

import type { DTOPlaylistLikes } from '@podverse/helpers';

import { useAccount } from './Account';

type PlaylistsLikesContextType = {
  playlistsLikes: DTOPlaylistLikes[];
  setPlaylistsLikes: (val: DTOPlaylistLikes[]) => void;
};

export const PlaylistsLikesContext = createContext<PlaylistsLikesContextType>({
  playlistsLikes: [],
  setPlaylistsLikes: () => {},
});

type PlaylistsLikesProviderProps = {
  children: ReactNode;
};

export const PlaylistsLikesProvider = ({ children }: PlaylistsLikesProviderProps) => {
  const [playlistsLikes, setPlaylistsLikes] = useState<DTOPlaylistLikes[]>([]);
  const { loggedInAccount } = useAccount();

  useEffect(() => {
    (async () => {
      if (!loggedInAccount) {
        setPlaylistsLikes([]);
        return;
      }

      const { getApiRequestService } = await import('../factories/apiRequestService');
      const data = await getApiRequestService().reqPlaylistGetAllLikesPrivate({
        includeResources: false,
      });
      setPlaylistsLikes(data);
    })();
  }, [loggedInAccount]);

  return (
    <PlaylistsLikesContext.Provider value={{ playlistsLikes, setPlaylistsLikes }}>
      {children}
    </PlaylistsLikesContext.Provider>
  );
};

export function usePlaylistsLikes() {
  const ctx = useContext(PlaylistsLikesContext);
  if (!ctx) {
    throw new Error('usePlaylistsLikes must be used within a PlaylistsLikesProvider');
  }
  return ctx;
}
