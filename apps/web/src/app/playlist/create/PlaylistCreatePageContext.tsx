'use client';

import { MediumEnum, SharableStatusEnum } from '@podverse/helpers';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

interface PlaylistCreatePageContextType {
  medium: string;
  setMedium: (medium: string) => void;
  sharableStatus: string;
  setSharableStatus: (status: string) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  isUpdating: boolean;
  setIsUpdating: (isUpdating: boolean) => void;
}

const PlaylistCreatePageContext = createContext<PlaylistCreatePageContextType | undefined>(
  undefined
);

interface PlaylistCreatePageContextProviderProps {
  children: ReactNode;
}

export const PlaylistCreatePageContextProvider = ({
  children,
}: PlaylistCreatePageContextProviderProps) => {
  const [medium, setMedium] = useState<string>(`${MediumEnum.AV}`);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [sharableStatus, setSharableStatus] = useState<string>(`${SharableStatusEnum.Private}`);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  return (
    <PlaylistCreatePageContext.Provider
      value={{
        medium,
        setMedium,
        title,
        setTitle,
        description,
        setDescription,
        sharableStatus,
        setSharableStatus,
        isUpdating,
        setIsUpdating,
      }}
    >
      {children}
    </PlaylistCreatePageContext.Provider>
  );
};

export const usePlaylistCreatePageContext = () => {
  const ctx = useContext(PlaylistCreatePageContext);
  if (!ctx) {
    throw new Error(
      'usePlaylistCreatePageContext must be used within a PlaylistCreatePageContextProvider'
    );
  }
  return ctx;
};
