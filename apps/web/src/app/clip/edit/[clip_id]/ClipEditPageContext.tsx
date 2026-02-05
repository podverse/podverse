'use client';

import type { DTOClip } from '@podverse/helpers';
import { formatNumericToHHMMSS } from '@podverse/helpers';
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useMediaPlayerResourceUpdate } from '../../../../hooks/useMediaPlayerResourceUpdate';
import { useAutoQueue } from '../../../../contexts/AutoQueue';

interface ClipEditPageContextType {
  sharableStatus: string;
  setSharableStatus: (status: string) => void;
  title: string;
  setTitle: (title: string) => void;
  startTimeString: string;
  setStartTimeString: (time: string) => void;
  endTimeString?: string | null;
  setEndTimeString: (time: string) => void;
  isUpdating: boolean;
  setIsUpdating: (updating: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const ClipEditPageContext = createContext<ClipEditPageContextType | undefined>(undefined);

interface ClipEditPageContextProviderProps {
  children: ReactNode;
  ssrClip: DTOClip;
  ssrEnclosureRowSelected: number;
  ssrEnclosureTypeSelected: 'default' | 'audio' | 'video';
}

export const ClipEditPageContextProvider = ({
  children,
  ssrClip,
  ssrEnclosureRowSelected,
  ssrEnclosureTypeSelected,
}: ClipEditPageContextProviderProps) => {
  const [sharableStatus, setSharableStatus] = useState<string>(`${ssrClip.sharable_status.id}`);
  const [title, setTitle] = useState<string>(ssrClip.title || '');
  const [startTimeString, setStartTimeString] = useState<string>(
    formatNumericToHHMMSS(ssrClip.start_time)
  );
  const [endTimeString, setEndTimeString] = useState<string | null>(
    ssrClip.end_time ? formatNumericToHHMMSS(ssrClip.end_time) : null
  );
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const { autoQueueConfig } = useAutoQueue();

  useEffect(() => {
    const item = ssrClip?.item;
    const channel = ssrClip?.item?.channel;

    if (item && channel) {
      mediaPlayerResourceUpdate({
        channel: channel,
        clip: ssrClip,
        item: item,
        itemChapter: null,
        itemChapterShouldSeek: false,
        itemSoundbite: null,
        isPlaying: false,
        skipMoveNowPlayingToHistory: false,
        enclosureSelectedParams: {
          type: ssrEnclosureTypeSelected,
          enclosureRowSelected: ssrEnclosureRowSelected,
          sourceRowSelected: null,
        },
        newAutoQueueConfig: {
          playlist_id_text: autoQueueConfig.playlist_id_text,
          disabled: true,
          random: autoQueueConfig.random,
          repeat: autoQueueConfig.repeat,
          nextPage: autoQueueConfig.nextPage,
          shuffleHash: autoQueueConfig.shuffleHash,
        },
        autoQueueShouldClear: true,
      });
    }
  }, []);

  return (
    <ClipEditPageContext.Provider
      value={{
        sharableStatus,
        setSharableStatus,
        title,
        setTitle,
        startTimeString,
        setStartTimeString,
        endTimeString,
        setEndTimeString,
        isUpdating,
        setIsUpdating,
        onSubmit: () => {},
        onCancel: () => {},
      }}
    >
      {children}
    </ClipEditPageContext.Provider>
  );
};

export const useClipEditPageContext = () => {
  const ctx = useContext(ClipEditPageContext);
  if (!ctx) {
    throw new Error('useClipEditPageContext must be used within a ClipEditPageContextProvider');
  }
  return ctx;
};
