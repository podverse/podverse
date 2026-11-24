import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  TranscriptRow,
} from '@podverse/helpers/dto';

import { requestWithMobileAuthRefresh, useAuth } from '../../auth';
import type { EpisodeClipSort, EpisodeTab } from '../../prefs/detailListPrefs';
import {
  DEFAULT_EPISODE_CLIP_SORT,
  DEFAULT_EPISODE_TAB,
  readEpisodeDetailPrefs,
  writeEpisodeDetailClipSort,
} from '../../prefs/detailListPrefs';
import {
  loadEpisodeChaptersPane,
  loadEpisodeClipsPane,
  loadEpisodeSoundbitesPane,
  loadEpisodeTranscriptPane,
} from './episodeSectionPaneLoaders';
import type { EpisodePanePreviewFlags } from './episodeTabs';
import { resolveEpisodeTabForItem, resolveEpisodeTabs } from './episodeTabs';

type UseEpisodeSectionPanesParams = {
  episode: DTOItem | null;
  itemIdText: string | null;
  offlineModeEnabled: boolean;
  previewFlags: EpisodePanePreviewFlags | null;
};

type LoadedTabs = Record<EpisodeTab, boolean>;

type UseEpisodeSectionPanesResult = {
  activeTab: EpisodeTab;
  chapterRows: DTOItemChapter[];
  clipHasMore: boolean;
  clipLoadMoreErrorKey: string | null;
  clipRows: DTOClip[];
  clipSort: EpisodeClipSort;
  isLoadingMoreClips: boolean;
  isPrefsHydrated: boolean;
  isTabLoading: boolean;
  loadMoreClips: () => Promise<void>;
  loadTab: (tab: EpisodeTab) => Promise<void>;
  selectClipSort: (sort: EpisodeClipSort) => void;
  selectTab: (tab: EpisodeTab) => void;
  soundbiteRows: DTOItemSoundbite[];
  supportedTabs: EpisodeTab[];
  tabErrorKey: string | null;
  transcriptRows: TranscriptRow[];
};

const createLoadedTabs = (): LoadedTabs => ({
  chapters: false,
  clips: false,
  funding: true,
  people: true,
  soundbites: false,
  summary: true,
  transcript: false,
});

export function useEpisodeSectionPanes({
  episode,
  itemIdText,
  offlineModeEnabled,
  previewFlags,
}: UseEpisodeSectionPanesParams): UseEpisodeSectionPanesResult {
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const clipGenerationRef = useRef(0);
  const clipPageRef = useRef(0);
  const isLoadingMoreClipsRef = useRef(false);
  const [activeTab, setActiveTab] = useState<EpisodeTab>(DEFAULT_EPISODE_TAB);
  const [clipSort, setClipSort] = useState<EpisodeClipSort>(DEFAULT_EPISODE_CLIP_SORT);
  const [isPrefsHydrated, setIsPrefsHydrated] = useState(false);
  const [isTabFetching, setIsTabFetching] = useState(false);
  const [isLoadingMoreClips, setIsLoadingMoreClips] = useState(false);
  const [clipHasMore, setClipHasMore] = useState(false);
  const [clipLoadMoreErrorKey, setClipLoadMoreErrorKey] = useState<string | null>(null);
  const [tabErrorKey, setTabErrorKey] = useState<string | null>(null);
  const [chapterRows, setChapterRows] = useState<DTOItemChapter[]>([]);
  const [soundbiteRows, setSoundbiteRows] = useState<DTOItemSoundbite[]>([]);
  const [clipRows, setClipRows] = useState<DTOClip[]>([]);
  const [transcriptRows, setTranscriptRows] = useState<TranscriptRow[]>([]);
  const [loadedTabs, setLoadedTabs] = useState<LoadedTabs>(createLoadedTabs);

  const supportedTabs = useMemo(
    () => resolveEpisodeTabs({ episode, previewFlags }),
    [episode, previewFlags]
  );

  useEffect(() => {
    setActiveTab(DEFAULT_EPISODE_TAB);
    setClipSort(DEFAULT_EPISODE_CLIP_SORT);
    setIsPrefsHydrated(itemIdText === null);
    setIsTabFetching(false);
    setIsLoadingMoreClips(false);
    setClipHasMore(false);
    setClipLoadMoreErrorKey(null);
    setTabErrorKey(null);
    setChapterRows([]);
    setSoundbiteRows([]);
    setClipRows([]);
    setTranscriptRows([]);
    setLoadedTabs(createLoadedTabs());
    clipGenerationRef.current += 1;
    clipPageRef.current = 0;

    if (itemIdText === null) {
      return;
    }

    let isMounted = true;
    void (async () => {
      const stored = await readEpisodeDetailPrefs(itemIdText);
      if (!isMounted) {
        return;
      }
      setClipSort(stored.clipSort);
      setIsPrefsHydrated(true);
    })();

    return () => {
      isMounted = false;
    };
  }, [itemIdText]);

  useEffect(() => {
    if (episode === null) {
      return;
    }
    const nextTab = resolveEpisodeTabForItem({
      selectedTab: activeTab,
      supportedTabs,
    });
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, episode, supportedTabs]);

  const loadTab = useCallback(
    async (tab: EpisodeTab): Promise<void> => {
      if (
        itemIdText === null ||
        tab === 'summary' ||
        tab === 'funding' ||
        tab === 'people' ||
        loadedTabs[tab]
      ) {
        return;
      }

      if (offlineModeEnabled) {
        if (tab === 'soundbites' && episode !== null && episode.item_soundbites.length > 0) {
          setSoundbiteRows(episode.item_soundbites);
          setLoadedTabs((previous) => ({
            ...previous,
            soundbites: true,
          }));
        }
        return;
      }

      setIsTabFetching(true);
      setTabErrorKey(null);
      try {
        if (tab === 'chapters') {
          const chapters = await loadEpisodeChaptersPane(async () =>
            requestWithMobileAuthRefresh(
              {
                accessToken,
                clearSession,
                refreshToken,
                setTokens,
              },
              async (api) => api.reqItemParseAndGetChapters(itemIdText)
            )
          );
          setChapterRows(chapters);
        } else if (tab === 'soundbites') {
          const soundbites = await loadEpisodeSoundbitesPane(async () =>
            requestWithMobileAuthRefresh(
              {
                accessToken,
                clearSession,
                refreshToken,
                setTokens,
              },
              async (api) =>
                api.reqItemSoundbiteGetManyByItemIdText(itemIdText, {
                  page: 1,
                  sort: 'recent',
                })
            )
          );
          setSoundbiteRows(soundbites);
        } else if (tab === 'clips') {
          clipGenerationRef.current += 1;
          const clips = await loadEpisodeClipsPane(
            async () =>
              requestWithMobileAuthRefresh(
                {
                  accessToken,
                  clearSession,
                  refreshToken,
                  setTokens,
                },
                async (api) =>
                  api.reqClipGetManyByItemPublic({
                    idOrIdText: itemIdText,
                    page: 1,
                    range: null,
                    sort: clipSort,
                  })
              ),
            1
          );
          clipPageRef.current = 1;
          setClipRows(clips.rows);
          setClipHasMore(clips.hasMore);
        } else if (tab === 'transcript') {
          const rows = await loadEpisodeTranscriptPane(async () =>
            requestWithMobileAuthRefresh(
              {
                accessToken,
                clearSession,
                refreshToken,
                setTokens,
              },
              async (api) => api.reqItemTranscriptGet(itemIdText)
            )
          );
          setTranscriptRows(rows);
        }

        setLoadedTabs((previous) => ({
          ...previous,
          [tab]: true,
        }));
      } catch {
        setTabErrorKey('errors.generic');
      } finally {
        setIsTabFetching(false);
      }
    },
    [
      accessToken,
      clearSession,
      clipSort,
      episode,
      itemIdText,
      loadedTabs,
      offlineModeEnabled,
      refreshToken,
      setTokens,
    ]
  );

  useEffect(() => {
    if (
      !isPrefsHydrated ||
      activeTab === 'summary' ||
      activeTab === 'funding' ||
      activeTab === 'people'
    ) {
      return;
    }
    void loadTab(activeTab);
  }, [activeTab, isPrefsHydrated, loadTab]);

  const selectTab = useCallback((tab: EpisodeTab) => {
    setActiveTab(tab);
  }, []);

  const selectClipSort = useCallback(
    (sort: EpisodeClipSort) => {
      setClipSort(sort);
      if (itemIdText !== null) {
        void writeEpisodeDetailClipSort(itemIdText, sort);
      }
      setClipRows([]);
      setClipHasMore(false);
      setClipLoadMoreErrorKey(null);
      clipGenerationRef.current += 1;
      clipPageRef.current = 0;
      setLoadedTabs((previous) => ({ ...previous, clips: false }));
      if (!offlineModeEnabled) {
        setIsTabFetching(true);
      }
    },
    [itemIdText, offlineModeEnabled]
  );

  const loadMoreClips = useCallback(async () => {
    if (
      itemIdText === null ||
      isLoadingMoreClipsRef.current ||
      !clipHasMore ||
      offlineModeEnabled
    ) {
      return;
    }

    const generation = clipGenerationRef.current;
    isLoadingMoreClipsRef.current = true;
    setIsLoadingMoreClips(true);
    setClipLoadMoreErrorKey(null);
    try {
      const nextPage = clipPageRef.current + 1;
      const next = await loadEpisodeClipsPane(
        async () =>
          requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) =>
              api.reqClipGetManyByItemPublic({
                idOrIdText: itemIdText,
                page: nextPage,
                range: null,
                sort: clipSort,
              })
          ),
        nextPage
      );
      if (generation !== clipGenerationRef.current) {
        return;
      }
      clipPageRef.current = nextPage;
      setClipRows((current) => [...current, ...next.rows]);
      setClipHasMore(next.hasMore);
    } catch {
      if (generation !== clipGenerationRef.current) {
        return;
      }
      setClipLoadMoreErrorKey('errors.generic');
    } finally {
      isLoadingMoreClipsRef.current = false;
      setIsLoadingMoreClips(false);
    }
  }, [
    accessToken,
    clearSession,
    clipHasMore,
    clipSort,
    itemIdText,
    offlineModeEnabled,
    refreshToken,
    setTokens,
  ]);

  // Unloaded network tabs stay on the spinner until loadedTabs flips — otherwise chapters/clips
  // paint "nothing found" for a frame before loadTab runs.
  const isTabLoading =
    isTabFetching ||
    (activeTab !== 'summary' &&
      activeTab !== 'funding' &&
      !loadedTabs[activeTab] &&
      tabErrorKey === null &&
      !offlineModeEnabled);

  return {
    activeTab,
    chapterRows,
    clipHasMore,
    clipLoadMoreErrorKey,
    clipRows,
    clipSort,
    isLoadingMoreClips,
    isPrefsHydrated,
    isTabLoading,
    loadMoreClips,
    loadTab,
    selectClipSort,
    selectTab,
    soundbiteRows,
    supportedTabs,
    tabErrorKey,
    transcriptRows,
  };
}
