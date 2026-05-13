import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

import type {
  AddByRSSResourceData,
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  EnclosureSelectedParams,
  LabeledItemEnclosure,
  PlaybackMode,
  PlaybackSpeedValue,
} from '@podverse/helpers';

import type { PlaybackLoadDecision, PlaybackLoadRequest, PlaybackTarget } from '../lib/playback';
import { resolvePlaybackLoadDecision } from '../lib/playback';
import { useQueueResourcesAbridgedIndex } from './QueueResourcesAbridgedIndex';

/** State for "now playing" when the source is add-by-RSS (no DTO item). */
export type MediaPlayerAddByRSSState = {
  idText: string;
  resourceData: AddByRSSResourceData;
} | null;

type MediaPlayerContextType = {
  /** When set, now playing is an add-by-RSS item; use for enclosure URL and display. */
  mpAddByRSS: MediaPlayerAddByRSSState;
  setMPAddByRSS: (val: MediaPlayerAddByRSSState) => void;
  mpChannel: DTOChannel | null;
  setMPChannel: (val: DTOChannel | null) => void;
  mpItem: DTOItem | null;
  setMPItem: (val: DTOItem | null) => void;
  mpItemLabeledItemEnclosures: LabeledItemEnclosure[];
  setMPItemLabeledItemEnclosures: (val: LabeledItemEnclosure[]) => void;
  mpEnclosureSelectedParams: EnclosureSelectedParams;
  setMPEnclosureSelectedParams: (val: EnclosureSelectedParams) => void;
  mpClip: DTOClip | null;
  setMPClip: (val: DTOClip | null) => void;
  mpItemChapter: DTOItemChapter | null;
  setMPItemChapter: (val: DTOItemChapter | null) => void;
  mpItemChapters: DTOItemChapter[] | null;
  setMPItemChapters: (val: DTOItemChapter[] | null) => void;
  mpItemChapterShouldSeek: boolean;
  setMPItemChapterShouldSeek: (val: boolean) => void;
  mpItemSoundbite: DTOItemSoundbite | null;
  setMPItemSoundbite: (val: DTOItemSoundbite | null) => void;
  mpIsPlaying: boolean;
  setMPIsPlaying: (val: boolean) => void;
  mpPlaybackMode: PlaybackMode;
  setMPPlaybackMode: (val: PlaybackMode) => void;
  mpPlaybackSpeed: PlaybackSpeedValue;
  setMPPlaybackSpeed: (val: PlaybackSpeedValue) => void;
  mpIsMuted: boolean;
  setMPIsMuted: (val: boolean) => void;
  mpVolume: number;
  setMPVolume: (val: number) => void;
  mpDuration: number;
  setMPDuration: (val: number) => void;
  playerModalIsOpen: boolean;
  setPlayerModalIsOpen: (val: boolean) => void;
  mpShouldPlay: boolean;
  setMPShouldPlay: (val: boolean) => void;
  /** One-shot seek time for Add-by-RSS restored position; set by usePlayAddByRSS, consumed and cleared by controller. */
  addByRSSSeekToTime: number | null;
  setAddByRSSSeekToTime: (val: number | null) => void;
  /** The current typed playback target being applied by the Phase 4 bridge. */
  activePlaybackTarget: PlaybackTarget | null;
  setActivePlaybackTarget: (target: PlaybackTarget | null) => void;
  /** The decision the Phase 4 bridge enacts after loadedmetadata. */
  pendingPlaybackDecision: PlaybackLoadDecision | null;
  setPendingPlaybackDecision: (decision: PlaybackLoadDecision | null) => void;
  /** Resolve and stage a target + decision in a single synchronous call. */
  applyPlaybackLoad: (request: PlaybackLoadRequest) => PlaybackLoadDecision;
};

export const MediaPlayerContext = createContext<MediaPlayerContextType | undefined>(undefined);

type MediaPlayerProviderProps = {
  children: ReactNode;
};

export const MediaPlayerProvider = ({ children }: MediaPlayerProviderProps) => {
  const { queueResourcesAbridgedIndex } = useQueueResourcesAbridgedIndex();
  const [mpAddByRSS, setMPAddByRSS] = useState<MediaPlayerAddByRSSState>(null);
  const [mpChannel, setMPChannel] = useState<DTOChannel | null>(null);
  const [mpItem, setMPItem] = useState<DTOItem | null>(null);
  const [mpItemLabeledItemEnclosures, setMPItemLabeledItemEnclosures] = useState<
    LabeledItemEnclosure[]
  >([]);
  const [mpEnclosureSelectedParams, setMPEnclosureSelectedParams] =
    useState<EnclosureSelectedParams>({
      type: 'default',
      enclosureRowSelected: null,
      sourceRowSelected: null,
    });
  const [mpClip, setMPClip] = useState<DTOClip | null>(null);
  const [mpItemChapter, setMPItemChapter] = useState<DTOItemChapter | null>(null);
  const [mpItemChapters, setMPItemChapters] = useState<DTOItemChapter[] | null>(null);
  const [mpItemChapterShouldSeek, setMPItemChapterShouldSeek] = useState<boolean>(false);
  const [mpItemSoundbite, setMPItemSoundbite] = useState<DTOItemSoundbite | null>(null);
  const [mpIsPlaying, setMPIsPlaying] = useState<boolean>(false);
  const [mpPlaybackMode, setMPPlaybackMode] = useState<PlaybackMode>('autoplay-next');
  const [mpPlaybackSpeed, setMPPlaybackSpeed] = useState<PlaybackSpeedValue>(1.0);
  const [mpIsMuted, setMPIsMuted] = useState<boolean>(false);
  const [mpVolume, setMPVolume] = useState<number>(1.0);
  const [mpDuration, setMPDuration] = useState<number>(0);
  const [playerModalIsOpen, setPlayerModalIsOpen] = useState<boolean>(false);
  const [mpShouldPlay, setMPShouldPlay] = useState<boolean>(false);
  const [addByRSSSeekToTime, setAddByRSSSeekToTime] = useState<number | null>(null);
  const [activePlaybackTarget, setActivePlaybackTarget] = useState<PlaybackTarget | null>(null);
  const [pendingPlaybackDecision, setPendingPlaybackDecision] =
    useState<PlaybackLoadDecision | null>(null);

  const applyPlaybackLoad = useCallback(
    (request: PlaybackLoadRequest): PlaybackLoadDecision => {
      const decision = resolvePlaybackLoadDecision(request, {
        abridged: queueResourcesAbridgedIndex,
      });
      setActivePlaybackTarget(request.target);
      setPendingPlaybackDecision(decision);
      return decision;
    },
    [queueResourcesAbridgedIndex]
  );

  return (
    <MediaPlayerContext.Provider
      value={{
        mpAddByRSS,
        setMPAddByRSS,
        mpChannel,
        setMPChannel,
        mpItem,
        setMPItem,
        mpItemLabeledItemEnclosures,
        setMPItemLabeledItemEnclosures,
        mpEnclosureSelectedParams,
        setMPEnclosureSelectedParams,
        mpClip,
        setMPClip,
        mpItemChapter,
        setMPItemChapter,
        mpItemChapters,
        setMPItemChapters,
        mpItemChapterShouldSeek,
        setMPItemChapterShouldSeek,
        mpItemSoundbite,
        setMPItemSoundbite,
        mpIsPlaying,
        setMPIsPlaying,
        mpPlaybackMode,
        setMPPlaybackMode,
        mpPlaybackSpeed,
        setMPPlaybackSpeed,
        mpIsMuted,
        setMPIsMuted,
        mpVolume,
        setMPVolume,
        mpDuration,
        setMPDuration,
        playerModalIsOpen,
        setPlayerModalIsOpen,
        mpShouldPlay,
        setMPShouldPlay,
        addByRSSSeekToTime,
        setAddByRSSSeekToTime,
        activePlaybackTarget,
        setActivePlaybackTarget,
        pendingPlaybackDecision,
        setPendingPlaybackDecision,
        applyPlaybackLoad,
      }}
    >
      {children}
    </MediaPlayerContext.Provider>
  );
};

export function useMediaPlayer() {
  const ctx = useContext(MediaPlayerContext);
  if (!ctx) {
    throw new Error('useMediaPlayer must be used within a MediaPlayerProvider');
  }
  return ctx;
}
