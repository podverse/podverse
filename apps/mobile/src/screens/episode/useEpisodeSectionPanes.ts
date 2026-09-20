import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { DTOClip, DTOItem, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers/dto';

import { requestWithMobileAuthRefresh, useAuth } from '../../auth';
import type { ItemSectionChromeFlags } from '../../lib/sectionChromeFlags';
import type { EpisodeClipSort, EpisodeTab } from '../../prefs/detailListPrefs';
import {
  DEFAULT_EPISODE_CLIP_SORT,
  DEFAULT_EPISODE_TAB,
  readEpisodeDetailPrefs,
  writeEpisodeDetailClipSort,
  writeEpisodeDetailTab,
} from '../../prefs/detailListPrefs';
import {
  loadEpisodeChaptersPane,
  loadEpisodeClipsPane,
  loadEpisodeSoundbitesPane,
  loadEpisodeTranscriptPane,
} from './episodeSectionPaneLoaders';
import { resolveEpisodeTabForItem, resolveEpisodeTabs } from './episodeTabs';

type UseEpisodeSectionPanesParams = {
  episode: DTOItem | null;
  itemIdText: string | null;
  offlineModeEnabled: boolean;
  previewFlags: ItemSectionChromeFlags | null;
};

type LoadedTabs = Record<EpisodeTab, boolean>;

type UseEpisodeSectionPanesResult = {
  activeTab: EpisodeTab;
  chapterRows: DTOItemChapter[];
  clipHasMore: boolean;
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
  transcriptText: string;
};

const createLoadedTabs = (): LoadedTabs => ({
  chapters: false,
  clips: false,
  funding: true,
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
  const clipPageRef = useRef(0);
  const [activeTab, setActiveTab] = useState<EpisodeTab>(DEFAULT_EPISODE_TAB);
  const [clipSort, setClipSort] = useState<EpisodeClipSort>(DEFAULT_EPISODE_CLIP_SORT);
  const [isPrefsHydrated, setIsPrefsHydrated] = useState(false);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [isLoadingMoreClips, setIsLoadingMoreClips] = useState(false);
  const [clipHasMore, setClipHasMore] = useState(false);
  const [tabErrorKey, setTabErrorKey] = useState<string | null>(null);
  const [chapterRows, setChapterRows] = useState<DTOItemChapter[]>([]);
  const [soundbiteRows, setSoundbiteRows] = useState<DTOItemSoundbite[]>([]);
  const [clipRows, setClipRows] = useState<DTOClip[]>([]);
  const [transcriptText, setTranscriptText] = useState('');
  const [loadedTabs, setLoadedTabs] = useState<LoadedTabs>(createLoadedTabs);

  const supportedTabs = useMemo(
    () => resolveEpisodeTabs({ episode, previewFlags }),
    [episode, previewFlags]
  );

  useEffect(() => {
    setActiveTab(DEFAULT_EPISODE_TAB);
    setClipSort(DEFAULT_EPISODE_CLIP_SORT);
    setIsPrefsHydrated(itemIdText === null);
    setIsTabLoading(false);
    setIsLoadingMoreClips(false);
    setClipHasMore(false);
    setTabErrorKey(null);
    setChapterRows([]);
    setSoundbiteRows([]);
    setClipRows([]);
    setTranscriptText('');
    setLoadedTabs(createLoadedTabs());
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
      setActiveTab(stored.tab);
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
      rememberedTab: activeTab,
      supportedTabs,
    });
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, episode, supportedTabs]);

  const loadTab = useCallback(
    async (tab: EpisodeTab): Promise<void> => {
      if (itemIdText === null || tab === 'summary' || tab === 'funding' || loadedTabs[tab]) {
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

      setIsTabLoading(true);
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
          const transcript = await loadEpisodeTranscriptPane(async () =>
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
          setTranscriptText(transcript);
        }

        setLoadedTabs((previous) => ({
          ...previous,
          [tab]: true,
        }));
      } catch {
        setTabErrorKey('errors.generic');
      } finally {
        setIsTabLoading(false);
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
    if (!isPrefsHydrated || activeTab === 'summary' || activeTab === 'funding') {
      return;
    }
    void loadTab(activeTab);
  }, [activeTab, isPrefsHydrated, loadTab]);

  const selectTab = useCallback(
    (tab: EpisodeTab) => {
      setActiveTab(tab);
      if (itemIdText !== null) {
        void writeEpisodeDetailTab(itemIdText, tab);
      }
    },
    [itemIdText]
  );

  const selectClipSort = useCallback(
    (sort: EpisodeClipSort) => {
      setClipSort(sort);
      if (itemIdText !== null) {
        void writeEpisodeDetailClipSort(itemIdText, sort);
      }
      setClipRows([]);
      setClipHasMore(false);
      clipPageRef.current = 0;
      setLoadedTabs((previous) => ({ ...previous, clips: false }));
    },
    [itemIdText]
  );

  const loadMoreClips = useCallback(async () => {
    if (itemIdText === null || isLoadingMoreClips || !clipHasMore || offlineModeEnabled) {
      return;
    }

    setIsLoadingMoreClips(true);
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
      clipPageRef.current = nextPage;
      setClipRows((current) => [...current, ...next.rows]);
      setClipHasMore(next.hasMore);
    } catch {
      setTabErrorKey('errors.generic');
    } finally {
      setIsLoadingMoreClips(false);
    }
  }, [
    accessToken,
    clearSession,
    clipHasMore,
    clipSort,
    isLoadingMoreClips,
    itemIdText,
    offlineModeEnabled,
    refreshToken,
    setTokens,
  ]);

  return {
    activeTab,
    chapterRows,
    clipHasMore,
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
    transcriptText,
  };
}
