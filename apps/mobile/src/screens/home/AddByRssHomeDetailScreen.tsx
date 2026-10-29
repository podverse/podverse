import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ComponentType, ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { buildAddByRssBoostChannel } from '@podverse/parser-mapping';
import { getBoostEligibilityForContent } from '@podverse/v4v-metaboost';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { useBoostSheet } from '../../components/boost/useBoostSheet';
import { ChannelDetailShell, ChannelHeader } from '../../components/channel';
import type { MenuSelectChipOption, SectionChipItem } from '../../components/form';
import { ListFilterField, MenuSelectChip } from '../../components/form';
import { Button } from '../../components/primitives/Button';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { HeaderBarActions } from '../../components/screen/HeaderBarActions';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import {
  addByRssRepository,
  channelSeenRepository,
  subscriptionsRepository,
} from '../../data/repositories';
import { useAddByRssArtworkHeaders } from '../../hooks/useAddByRssArtworkHeaders';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type {
  AddByRssDetailTab,
  AddByRssEpisodeSort,
  AddByRssTrackSort,
} from '../../prefs/detailListPrefs';
import {
  ADD_BY_RSS_EPISODE_SORT_OPTIONS,
  ADD_BY_RSS_TRACK_SORT_OPTIONS,
  DEFAULT_ADD_BY_RSS_EPISODE_SORT,
  DEFAULT_ADD_BY_RSS_TRACK_SORT,
  readAddByRssEpisodeSort,
  readAddByRssTrackSort,
  writeAddByRssDetailSort,
} from '../../prefs/detailListPrefs';
import { isOfflineModeEnabled, useOfflineMode } from '../../prefs/offlineMode';
import { useTheme } from '../../theme/useTheme';
import { useArtistUnsubscribe } from '../artist/useArtistUnsubscribe';
import { AddByRssAboutSection } from './addByRss/AddByRssAboutSection';
import { AddByRssArtistAlbumsSection } from './addByRss/AddByRssArtistAlbumsSection';
import { AddByRssArtistTracksSection } from './addByRss/AddByRssArtistTracksSection';
import {
  ADD_BY_RSS_SECTION_LABEL_KEYS,
  addByRssItemsTab,
  isAddByRssFilterableSection,
  isAddByRssMusicFeed,
  isAddByRssSortableSection,
  resolveAddByRssInitialSection,
  resolveAddByRssSections,
} from './addByRss/addByRssDetailSections';
import { AddByRssDownloadedSection } from './addByRss/AddByRssDownloadedSection';
import { AddByRssEpisodesSection } from './addByRss/AddByRssEpisodesSection';
import { AddByRssFundingSection } from './addByRss/AddByRssFundingSection';
import { AddByRssPeopleSection } from './addByRss/AddByRssPeopleSection';
import {
  AddByRssPodrollSection,
  AddByRssRemoteItemsSection,
} from './addByRss/AddByRssRemoteItemListSection';
import { getAddByRssRemoteRefsForDetail } from './addByRss/addByRssRemoteItems';
import type { AddByRssSectionPaneProps } from './addByRss/addByRssSectionPane';
import { AddByRssSettingsPane } from './addByRss/AddByRssSettingsPane';
import type { AddByRssDetailStackParamList } from './addByRss/addByRssStackParams';
import { useAddByRssFeedCheck } from './addByRss/useAddByRssFeedCheck';
import type { AddByRssHomeDetailData } from './addByRssHomeDetailData';
import { addByRssFeedHeaderArtwork, buildAddByRssHomeDetailData } from './addByRssHomeDetailData';

type AddByRssHomeDetailScreenProps = NativeStackScreenProps<
  AddByRssDetailStackParamList,
  'AddByRssPodcastDetail'
>;

type AddByRssDetailSort = AddByRssEpisodeSort | AddByRssTrackSort;

const EPISODE_SORT_LABEL_KEYS: Record<AddByRssEpisodeSort, string> = {
  oldest: 'filters.sort.oldest',
  recent: 'filters.sort.recent',
};

const TRACK_SORT_LABEL_KEYS: Record<AddByRssTrackSort, string> = {
  backward: 'filters.sort.backward',
  forward: 'filters.sort.forward',
};

/** One component per section. Episodes and tracks share the items list; an artist's tracks do not. */
const SECTION_COMPONENTS: Record<AddByRssDetailTab, ComponentType<AddByRssSectionPaneProps>> = {
  about: AddByRssAboutSection,
  albums: AddByRssArtistAlbumsSection,
  downloaded: AddByRssDownloadedSection,
  episodes: AddByRssEpisodesSection,
  funding: AddByRssFundingSection,
  people: AddByRssPeopleSection,
  podroll: AddByRssPodrollSection,
  remote_items: AddByRssRemoteItemsSection,
  tracks: AddByRssEpisodesSection,
};

const isEpisodeSort = (sort: AddByRssDetailSort): sort is AddByRssEpisodeSort =>
  sort === 'oldest' || sort === 'recent';

const isTrackSort = (sort: AddByRssDetailSort): sort is AddByRssTrackSort =>
  sort === 'backward' || sort === 'forward';

/**
 * An add-by-RSS feed, as one column at every width.
 *
 * The screen owns identity and controls. Each section owns its list. Podcast feeds offer
 * Episodes, Downloaded, and About. Artist feeds offer Albums, Tracks, and About. Album and
 * track feeds offer Tracks and About.
 * Podroll follows About when the bundle lists podroll references, and Remote Items follows
 * Podroll on a podcast or album feed when the bundle lists channel remote items. Funding and
 * People follow when the feed lists them. Music feeds never offer Downloaded. Podroll and
 * Remote Items list the feeds and items this feed points to, from the parsed bundle; entries
 * the device or the directory does not know are looked up when tapped. Clips and Official
 * Clips are server rows keyed to a server item id, so this screen does not offer them. Boosts
 * is a web-only tab, and the podcast screen has no Boosts chip either. Chips come from the
 * parsed bundle already on the device. Unsubscribe removes a feed that no Add by RSS artist
 * on the device lists. An album an artist lists stays on this screen, and Subscribe follows it.
 * Signed out, a listed-only album shows neither button. The page is not shareable, and
 * notifications need a server channel, so this screen has neither share nor a
 * bell. Settings holds the feed check and the username and password, which stay on this device.
 * Notifications and auto-download are keyed to a server channel, so Settings does not show them.
 */
export function AddByRssHomeDetailScreen({ navigation, route }: AddByRssHomeDetailScreenProps) {
  const { t } = useTranslation();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { styles: themeStyles, tokens } = useTheme();
  const { boostSheet, openBoost } = useBoostSheet();
  const { artistUnsubscribeDialog, unsubscribeArtist } = useArtistUnsubscribe();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { openGate } = useMembershipGate();
  const { evaluateFeature } = useAccessTier();
  const feedIdText = route.params.feedIdText;
  const [activeFeedId, setActiveFeedId] = useState(feedIdText);
  const [detail, setDetail] = useState<AddByRssHomeDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [removeErrorKey, setRemoveErrorKey] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [section, setSection] = useState<AddByRssDetailTab>('episodes');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [sort, setSort] = useState<AddByRssDetailSort>(DEFAULT_ADD_BY_RSS_EPISODE_SORT);
  const [isSortHydrated, setIsSortHydrated] = useState<boolean>(false);
  const [filterTerm, setFilterTerm] = useState<string>('');
  const [visitLastSeenAtMs, setVisitLastSeenAtMs] = useState<number | null | undefined>(undefined);
  const loadGenerationRef = useRef(0);
  const feedIdTextRef = useRef(feedIdText);
  /** The feed-change effect just chose the section; the fallback must not overwrite it. */
  const skipSectionFallbackRef = useRef(false);
  feedIdTextRef.current = feedIdText;

  if (activeFeedId !== feedIdText) {
    setActiveFeedId(feedIdText);
    setDetail(null);
    setIsLoading(true);
    setErrorKey(null);
    setRemoveErrorKey(null);
    setSettingsOpen(false);
    setFilterTerm('');
    setIsSortHydrated(false);
    setVisitLastSeenAtMs(undefined);
  }

  const screenStyle = useMemo(
    () => ({
      backgroundColor: themeStyles.screen.backgroundColor,
      flex: 1,
    }),
    [themeStyles.screen.backgroundColor]
  );

  const loadDetail = useCallback(
    async ({ silent }: { silent: boolean }) => {
      const generation = ++loadGenerationRef.current;
      if (!silent) {
        setErrorKey(null);
      }
      try {
        const feed = await addByRssRepository.getFeedByIdText(feedIdText);
        if (generation !== loadGenerationRef.current) {
          return;
        }
        if (feed === null) {
          if (!silent) {
            setDetail(null);
            setErrorKey('errors.generic');
          }
          return;
        }

        const mappedFeed = await addByRssRepository.getMappedFeedByUrl(feed.feedUrl);
        if (generation !== loadGenerationRef.current) {
          return;
        }
        setDetail(buildAddByRssHomeDetailData(feed, mappedFeed));
      } catch {
        if (generation !== loadGenerationRef.current) {
          return;
        }
        if (!silent) {
          setDetail(null);
          setErrorKey('errors.generic');
        }
      } finally {
        if (!silent && generation === loadGenerationRef.current) {
          setIsLoading(false);
        }
      }
    },
    [feedIdText]
  );

  const reloadDetailSilently = useCallback(async () => {
    // A check started on the previous feed must not load that feed over the one on screen.
    if (feedIdTextRef.current !== feedIdText) {
      return;
    }
    await loadDetail({ silent: true });
  }, [feedIdText, loadDetail]);

  const detailFeedUrl =
    detail !== null && detail.feed.idText === feedIdText ? detail.feed.feedUrl : null;
  const feedCheck = useAddByRssFeedCheck({
    feedUrl: detailFeedUrl,
    onChecked: reloadDetailSilently,
  });

  useEffect(() => {
    setIsLoading(true);
    void loadDetail({ silent: false });
  }, [loadDetail]);

  const loadedFeedId = detail?.feed.idText;
  const loadedResourceType = detail?.feed.resourceType;

  useEffect(() => {
    if (
      loadedFeedId === undefined ||
      loadedResourceType === undefined ||
      loadedFeedId !== feedIdText
    ) {
      return;
    }

    const isMusic = isAddByRssMusicFeed(loadedResourceType);
    skipSectionFallbackRef.current = true;
    setSection(
      resolveAddByRssInitialSection({
        isArtistFeed: loadedResourceType === 'artists',
        isMusicFeed: isMusic,
        offline: isOfflineModeEnabled(),
      })
    );
    setSettingsOpen(false);
    let cancelled = false;

    void (async () => {
      const nextSort = isMusic
        ? await readAddByRssTrackSort(loadedFeedId)
        : await readAddByRssEpisodeSort(loadedFeedId);
      if (!cancelled) {
        setSort(nextSort);
        setIsSortHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [feedIdText, loadedFeedId, loadedResourceType]);

  /**
   * Opening the feed marks it seen. The timestamp kept for this visit is the one stored before
   * that write, and episode rows use it to decide which items are new. Keyed on the feed URL so
   * a reload does not stamp the channel again.
   */
  const seenFeedUrl =
    detail !== null && detail.feed.idText === feedIdText ? detail.feed.feedUrl : null;
  useEffect(() => {
    if (seenFeedUrl === null) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const previous = await channelSeenRepository.markSeen(seenFeedUrl, 'add-by-rss');
      if (!cancelled) {
        setVisitLastSeenAtMs(previous);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seenFeedUrl]);

  const detailForRoute = detail !== null && detail.feed.idText === feedIdText ? detail : null;
  const isListedOnly = detailForRoute?.feed.followed === false;
  const isMusicFeed =
    detailForRoute !== null && isAddByRssMusicFeed(detailForRoute.feed.resourceType);
  const isArtistFeed = detailForRoute?.feed.resourceType === 'artists';

  const availableSections = useMemo(
    () =>
      resolveAddByRssSections({
        hasFunding: (detailForRoute?.fundings.length ?? 0) > 0,
        hasPeople: (detailForRoute?.people.length ?? 0) > 0,
        hasPodroll: getAddByRssRemoteRefsForDetail(detailForRoute, 'podroll').length > 0,
        hasRemoteItems: getAddByRssRemoteRefsForDetail(detailForRoute, 'remote_items').length > 0,
        isArtistFeed,
        isMusicFeed,
      }),
    [detailForRoute, isArtistFeed, isMusicFeed]
  );

  /**
   * A selected section still has to exist on this feed. Funding or people that left the parsed
   * bundle cannot stay selected. Falls back to the items chip.
   */
  useEffect(() => {
    if (detailForRoute === null) {
      return;
    }
    if (skipSectionFallbackRef.current) {
      skipSectionFallbackRef.current = false;
      return;
    }
    if (!availableSections.includes(section)) {
      setSection(addByRssItemsTab(isMusicFeed));
    }
  }, [availableSections, detailForRoute, isMusicFeed, section]);

  /**
   * Turning Offline Mode on while this screen is open selects Downloaded when that chip is
   * offered. Turning it off leaves the section alone. A tap while Offline Mode is on still
   * changes the section.
   */
  useEffect(() => {
    if (!offlineModeEnabled || isMusicFeed) {
      return;
    }
    setSection('downloaded');
  }, [feedIdText, isMusicFeed, offlineModeEnabled]);

  const boostChannel = useMemo(() => {
    if (detailForRoute === null) {
      return null;
    }
    return buildAddByRssBoostChannel({
      ...detailForRoute.feed,
      mappedFeed: detailForRoute.mappedFeed ?? undefined,
    });
  }, [detailForRoute]);

  const canShowBoost =
    boostChannel !== null &&
    getBoostEligibilityForContent({ channel: boostChannel }).canShowBoostAction;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        if (boostChannel === null || !canShowBoost) {
          return null;
        }
        const channel = boostChannel;
        return (
          <HeaderBarActions>
            <HeaderBarAction
              accessibilityLabel={t('value.boost')}
              icon="cash-outline"
              iconColor={tokens.text.warning}
              onPress={() => {
                openBoost({ channel, item: null });
              }}
              testID="add-by-rss-home-boost"
            />
          </HeaderBarActions>
        );
      },
    });
  }, [boostChannel, canShowBoost, navigation, openBoost, t, tokens.text.warning]);

  const handleRemove = useCallback(async () => {
    if (detailForRoute === null || isRemoving) {
      return;
    }

    setIsRemoving(true);
    setRemoveErrorKey(null);
    try {
      if (isArtistFeed) {
        const headerTitle =
          detailForRoute.mappedFeed?.channel.channel.title ??
          detailForRoute.feed.title ??
          detailForRoute.feed.feedUrl;
        const result = await unsubscribeArtist({
          feedUrl: detailForRoute.feed.feedUrl,
          source: 'addByRss',
          title: headerTitle,
        });
        if (result.status === 'cancelled') {
          return;
        }
        homeFeedRefresh.notify();
        navigation.goBack();
        if (result.serverError) {
          setRemoveErrorKey('errors.generic');
        }
        return;
      }

      const result = await subscriptionsRepository.unsubscribe({
        accountSync:
          status === 'authenticated'
            ? { accessToken, clearSession, refreshToken, setTokens }
            : undefined,
        idText: detailForRoute.feed.feedUrl,
        source: 'addByRss',
      });
      if (result.addByRssOutcome === 'listed') {
        homeFeedRefresh.notify();
        setIsLoading(true);
        await loadDetail({ silent: false });
        return;
      }
      homeFeedRefresh.notify();
      navigation.goBack();
    } catch {
      setRemoveErrorKey('errors.generic');
    } finally {
      setIsRemoving(false);
    }
  }, [
    accessToken,
    clearSession,
    detailForRoute,
    isArtistFeed,
    isRemoving,
    loadDetail,
    navigation,
    refreshToken,
    setTokens,
    status,
    unsubscribeArtist,
  ]);

  const handleSubscribe = useCallback(async () => {
    if (detailForRoute === null || isRemoving || status !== 'authenticated') {
      return;
    }

    const access = evaluateFeature('add_by_rss_add');
    if (!access.allowed) {
      openGate(access.reason);
      return;
    }

    const feed = detailForRoute.feed;
    const headerTitle =
      detailForRoute.mappedFeed?.channel.channel.title ?? feed.title ?? feed.feedUrl;

    setIsRemoving(true);
    setRemoveErrorKey(null);
    try {
      await requestWithMobileAuthRefresh(
        { accessToken, clearSession, refreshToken, setTokens },
        (api) =>
          api.reqAccountFollowAddByRSSChannel({
            feed_url: feed.feedUrl,
            image_url: feed.imageUrl,
            title: headerTitle,
            ...(feed.requiresCredentials === true ? { requires_credentials: true } : {}),
          })
      );
      await addByRssRepository.setFollowed(feed.feedUrl, true);
      homeFeedRefresh.notify();
      setIsLoading(true);
      await loadDetail({ silent: false });
    } catch {
      setRemoveErrorKey('errors.generic');
    } finally {
      setIsRemoving(false);
    }
  }, [
    accessToken,
    clearSession,
    detailForRoute,
    evaluateFeature,
    isRemoving,
    loadDetail,
    openGate,
    refreshToken,
    setTokens,
    status,
  ]);

  const handleRemovePress = useCallback(() => {
    void handleRemove();
  }, [handleRemove]);

  const handleSubscribePress = useCallback(() => {
    void handleSubscribe();
  }, [handleSubscribe]);

  const handleRetryDetail = useCallback(() => {
    setIsLoading(true);
    void loadDetail({ silent: false });
  }, [loadDetail]);

  const handleSectionSelect = useCallback((next: AddByRssDetailTab) => {
    setSettingsOpen(false);
    setSection(next);
  }, []);

  const handleSettingsPress = useCallback(() => {
    setSettingsOpen((open) => !open);
  }, []);

  const handleSortSelect = useCallback(
    (next: AddByRssDetailSort) => {
      setSort(next);
      if (detailForRoute !== null) {
        void writeAddByRssDetailSort(detailForRoute.feed.idText, next);
      }
    },
    [detailForRoute]
  );

  const sectionChips = useMemo<SectionChipItem<AddByRssDetailTab>[]>(
    () =>
      availableSections.map((available) => ({
        key: available,
        label: t(ADD_BY_RSS_SECTION_LABEL_KEYS[available]),
        testID: `add-by-rss-home-section-${available}`,
      })),
    [availableSections, t]
  );

  const episodeSortOptions = useMemo<MenuSelectChipOption<AddByRssEpisodeSort>[]>(
    () =>
      ADD_BY_RSS_EPISODE_SORT_OPTIONS.map((option) => ({
        label: t(EPISODE_SORT_LABEL_KEYS[option]),
        value: option,
      })),
    [t]
  );

  const trackSortOptions = useMemo<MenuSelectChipOption<AddByRssTrackSort>[]>(
    () =>
      ADD_BY_RSS_TRACK_SORT_OPTIONS.map((option) => ({
        label: t(TRACK_SORT_LABEL_KEYS[option]),
        value: option,
      })),
    [t]
  );

  const headerArtwork = useMemo(
    () =>
      detailForRoute === null
        ? { listUrl: null, viewerUrl: null }
        : addByRssFeedHeaderArtwork(detailForRoute.feed, detailForRoute.mappedFeed),
    [detailForRoute]
  );

  const headerArtworkHeaders = useAddByRssArtworkHeaders(
    detailForRoute?.feed.feedUrl ?? null,
    headerArtwork.listUrl
  );

  if (detailForRoute === null) {
    return (
      <View style={screenStyle} testID="add-by-rss-home-detail-screen">
        {errorKey !== null && !isLoading ? (
          <ListError
            messageKey={errorKey}
            onRetry={handleRetryDetail}
            testID="add-by-rss-home-error"
          />
        ) : (
          <LoadingSection testID="add-by-rss-home-loading" />
        )}
      </View>
    );
  }

  const headerTitle =
    detailForRoute.mappedFeed?.channel.channel.title ??
    detailForRoute.feed.title ??
    detailForRoute.feed.feedUrl;

  let headerActions: ReactNode = (
    <Button
      label={t('features.unsubscribe')}
      loading={isRemoving}
      onPress={handleRemovePress}
      size="sm"
      testID="add-by-rss-home-remove"
      variant="outline"
    />
  );
  if (isListedOnly && status === 'authenticated') {
    headerActions = (
      <Button
        label={t('features.subscribe')}
        loading={isRemoving}
        onPress={handleSubscribePress}
        size="sm"
        testID="add-by-rss-home-subscribe"
        variant="primary"
      />
    );
  } else if (isListedOnly) {
    headerActions = null;
  }

  const channelHeader = (
    <ChannelHeader
      actions={headerActions}
      artworkAddByRssFeedUrl={detailForRoute.feed.feedUrl}
      artworkHeaders={headerArtworkHeaders}
      artworkUri={headerArtwork.listUrl}
      notice={removeErrorKey === null ? null : t(removeErrorKey)}
      settings={{
        accessibilityLabel: t('settings.settings'),
        onPress: handleSettingsPress,
        selected: settingsOpen,
        testID: 'add-by-rss-home-header-settings',
      }}
      testID="add-by-rss-home-header"
      title={headerTitle}
      viewerUri={headerArtwork.viewerUrl}
    />
  );

  const listHeader = isAddByRssFilterableSection(section) ? (
    <ListFilterField
      label={t('filters.list.title_label')}
      onChangeTerm={setFilterTerm}
      placeholder={t('filters.list.placeholder')}
      term={filterTerm}
      testID="add-by-rss-home-filter"
    />
  ) : null;

  const SectionPane =
    isArtistFeed && section === 'tracks'
      ? AddByRssArtistTracksSection
      : SECTION_COMPONENTS[section];
  const sectionBody = settingsOpen ? (
    <AddByRssSettingsPane
      detail={detailForRoute}
      feedCheck={feedCheck}
      onCredentialsSaved={() => {
        void loadDetail({ silent: true });
      }}
    />
  ) : (
    <SectionPane
      detail={detailForRoute}
      filterTerm={filterTerm}
      isMusicFeed={isMusicFeed}
      listHeader={listHeader}
      onRefresh={() => feedCheck.checkFeed('pull')}
      refreshNoticeKey={feedCheck.noticeKey}
      sort={sort}
      visitLastSeenAtMs={visitLastSeenAtMs}
    />
  );

  const episodeSortValue = isEpisodeSort(sort) ? sort : DEFAULT_ADD_BY_RSS_EPISODE_SORT;
  const trackSortValue = isTrackSort(sort) ? sort : DEFAULT_ADD_BY_RSS_TRACK_SORT;
  const chipTrailing =
    settingsOpen || !isAddByRssSortableSection(section) ? undefined : isMusicFeed ? (
      <MenuSelectChip
        heading={t('filters.screen.sort_heading')}
        onSelect={handleSortSelect}
        options={trackSortOptions}
        testID="add-by-rss-home-sort"
        value={trackSortValue}
      />
    ) : (
      <MenuSelectChip
        heading={t('filters.screen.sort_heading')}
        onSelect={handleSortSelect}
        options={episodeSortOptions}
        testID="add-by-rss-home-sort"
        value={episodeSortValue}
      />
    );

  return (
    <>
      <ChannelDetailShell
        channelHeader={channelHeader}
        chipTrailing={chipTrailing}
        isSectionHydrated={isSortHydrated}
        loadingTestID="add-by-rss-home-section-loading"
        onSelectSection={handleSectionSelect}
        sectionBody={sectionBody}
        sectionChips={sectionChips}
        sectionsTestID="add-by-rss-home-sections"
        selectedSection={settingsOpen ? null : section}
        testID="add-by-rss-home-detail-screen"
      />
      {boostSheet}
      {artistUnsubscribeDialog}
    </>
  );
}
