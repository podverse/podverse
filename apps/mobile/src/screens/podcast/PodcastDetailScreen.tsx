import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import type { DTOChannel } from '@podverse/helpers';
import { primaryChannelLightboxArtworkUrl, primaryChannelListArtworkUrl } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { ChannelDetailShell, ChannelHeader } from '../../components/channel';
import type { MenuSelectChipOption, SectionChipItem } from '../../components/form';
import { ListFilterField, MenuSelectChip } from '../../components/form';
import { Button } from '../../components/primitives/Button';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { ListEmpty } from '../../components/state/ListEmpty';
import { channelSeenRepository } from '../../data/repositories/channelSeenRepository';
import { downloadsRepository } from '../../data/repositories/downloadsRepository';
import { sectionChromeFlagsRepository } from '../../data/repositories/sectionChromeFlagsRepository';
import { mapDirectoryChannelToSubscribed } from '../../data/repositories/subscriptionsMerge';
import { subscriptionsRepository } from '../../data/repositories/subscriptionsRepository';
import { useChannelNotifications } from '../../hooks/useChannelNotifications';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import {
  isPodcastSectionUnavailableOffline,
  OFFLINE_UNAVAILABLE_MESSAGE_KEY,
  resolvePodcastSectionForOfflineMode,
} from '../../lib/offlineModeViews';
import { getCachedChannelSectionFlags } from '../../lib/sectionChromeFlags';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type { ChannelBrowseStackParamList } from '../../navigation';
import type {
  PodcastDetailRange,
  PodcastDetailSort,
  PodcastTab,
} from '../../prefs/detailListPrefs';
import {
  DEFAULT_PODCAST_DETAIL_RANGE,
  DEFAULT_PODCAST_DETAIL_SORT,
  DEFAULT_PODCAST_TAB,
  PODCAST_DETAIL_RANGE_OPTIONS,
  PODCAST_DETAIL_SORT_OPTIONS,
  readPodcastDetailPrefs,
  writePodcastDetailRange,
  writePodcastDetailSort,
  writePodcastDetailTab,
} from '../../prefs/detailListPrefs';
import { isOfflineModeEnabled, useOfflineMode } from '../../prefs/offlineMode';
import { useTheme } from '../../theme/useTheme';
import {
  channelHasPodroll,
  isFilterableSection,
  isSortableSection,
  PODCAST_SECTION_LABEL_KEYS,
  readHasStoredSoundbites,
  resolvePodcastSections,
} from './podcastSections';
import type { PodcastSectionPaneProps } from './sections';
import {
  PodcastAboutSection,
  PodcastClipsSection,
  PodcastDownloadedSection,
  PodcastEpisodesSection,
  PodcastOfficialClipsSection,
  PodcastPodrollSection,
} from './sections';

type PodcastDetailScreenProps = NativeStackScreenProps<
  ChannelBrowseStackParamList,
  'PodcastDetail'
>;

const SORT_LABEL_KEYS: Record<PodcastDetailSort, string> = {
  oldest: 'filters.sort.oldest',
  recent: 'filters.sort.recent',
  top: 'filters.sort.top',
};

const RANGE_LABEL_KEYS: Record<PodcastDetailRange, string> = {
  'all-time': 'filters.range.all_time',
  day: 'filters.range.day',
  month: 'filters.range.month',
  week: 'filters.range.week',
};

/**
 * One component per section, so adding a section is a label, an availability rule, and an entry
 * here — never a branch inside the screen body.
 */
const SECTION_COMPONENTS: Record<PodcastTab, ComponentType<PodcastSectionPaneProps>> = {
  about: PodcastAboutSection,
  clips: PodcastClipsSection,
  downloaded: PodcastDownloadedSection,
  episodes: PodcastEpisodesSection,
  podroll: PodcastPodrollSection,
  soundbites: PodcastOfficialClipsSection,
};

/**
 * A podcast, as one column at every width.
 *
 * The screen owns identity and controls — the channel, the subscribe state, which section is
 * showing and how it is ordered. Artwork and chips stay pinned; the title filter is handed to the
 * active section as its list header. The section owns its own list, because the sections answer to
 * different endpoints and different row shapes, and a single list that tried to serve all of them
 * would branch on section in every callback.
 *
 * Actions on the channel as a whole live with the channel identity block so the same affordances
 * can be shared across podcast, album, and artist screens.
 */
export function PodcastDetailScreen({ navigation, route }: PodcastDetailScreenProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { podcastId, previewImageUrl, previewTitle } = route.params;
  const cachedChrome = getCachedChannelSectionFlags(podcastId);
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [isChannelLoading, setIsChannelLoading] = useState<boolean>(true);
  const [hasSoundbites, setHasSoundbites] = useState<boolean>(
    cachedChrome?.hasOfficialClips === true
  );
  const [previewHasPodroll, setPreviewHasPodroll] = useState<boolean>(
    cachedChrome?.hasPodroll === true
  );
  const [hasCheckedSoundbites, setHasCheckedSoundbites] = useState<boolean>(cachedChrome !== null);
  const chromeConfirmedRef = useRef(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isSavingSubscription, setIsSavingSubscription] = useState<boolean>(false);
  const [subscriptionNoticeKey, setSubscriptionNoticeKey] = useState<string | null>(null);
  const [section, setSection] = useState<PodcastTab>(DEFAULT_PODCAST_TAB);
  const [isSectionHydrated, setIsSectionHydrated] = useState<boolean>(false);
  const [sort, setSort] = useState<PodcastDetailSort>(DEFAULT_PODCAST_DETAIL_SORT);
  const [range, setRange] = useState<PodcastDetailRange>(DEFAULT_PODCAST_DETAIL_RANGE);
  /**
   * Free text lives only as long as the screen does. A remembered filter would reopen a podcast
   * showing a fraction of its episodes with no hint why, so unlike the section and the order this
   * one is deliberately not carried anywhere.
   */
  const [filterTerm, setFilterTerm] = useState<string>('');
  /**
   * List chrome known before the channel DTO arrives — route preview from the painted source row,
   * then SQLite for deep links into a subscribed show. Replaced when `channel` loads.
   */
  const [previewArtworkUri, setPreviewArtworkUri] = useState<string | null>(
    previewImageUrl !== undefined && previewImageUrl !== null && previewImageUrl.length > 0
      ? previewImageUrl
      : null
  );
  const [previewHeaderTitle, setPreviewHeaderTitle] = useState<string | null>(
    previewTitle !== undefined && previewTitle.length > 0 ? previewTitle : null
  );

  useEffect(() => {
    setPreviewArtworkUri(
      previewImageUrl !== undefined && previewImageUrl !== null && previewImageUrl.length > 0
        ? previewImageUrl
        : null
    );
    setPreviewHeaderTitle(
      previewTitle !== undefined && previewTitle.length > 0 ? previewTitle : null
    );
  }, [podcastId, previewImageUrl, previewTitle]);

  useEffect(() => {
    const nextChrome = getCachedChannelSectionFlags(podcastId);
    chromeConfirmedRef.current = false;
    setChannel(null);
    setIsChannelLoading(true);
    setHasSoundbites(nextChrome?.hasOfficialClips === true);
    setPreviewHasPodroll(nextChrome?.hasPodroll === true);
    setHasCheckedSoundbites(nextChrome !== null);
  }, [podcastId]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        channelActions: {
          gap: tokens.spacing.sm,
        },
        channelActionRow: {
          alignItems: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -tokens.spacing.sm,
        },
        subscribeButtonRow: {
          alignItems: 'flex-start',
        },
      }),
    [tokens]
  );

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  /**
   * The channel's own identity, and which of the conditional sections it can offer.
   *
   * Both are read again on every refresh, because a feed can gain a podroll or start marking clips
   * between visits and the chip row has to follow the feed rather than the first thing it saw.
   *
   * Failure is deliberately quiet: the sections below carry their own error states, and a channel
   * that will not load leaves a header with a generic title rather than replacing a working list
   * with an error.
   */
  const loadChannel = useCallback(async () => {
    try {
      const soundbites = await readHasStoredSoundbites(podcastId);
      setHasSoundbites(soundbites);
      setHasCheckedSoundbites(true);

      if (offlineModeEnabled) {
        const local = await subscriptionsRepository.getByIdText(podcastId);
        if (local !== null) {
          setPreviewHasPodroll(false);
        }
        chromeConfirmedRef.current = true;
        return;
      }

      try {
        const response = await requestWithMobileAuthRefresh(authContext, async (api) =>
          api.reqChannelGetByIdOrIdText(podcastId)
        );
        setChannel(response);
        const hasPodroll = channelHasPodroll(response);
        setPreviewHasPodroll(hasPodroll);
        void sectionChromeFlagsRepository.mergeChannel(podcastId, {
          hasOfficialClips: soundbites,
          hasPodroll,
        });
        // This screen is where the show's name is known for a channel the user does not follow, so it
        // is where any download of theirs that has only an id gets one.
        void downloadsRepository.attachChannelToDownloads({
          channelIdText: response.id_text ?? podcastId,
          channelTitle: response.title ?? null,
        });
        chromeConfirmedRef.current = true;
      } catch {
        void sectionChromeFlagsRepository.mergeChannel(podcastId, {
          hasOfficialClips: soundbites,
        });
        chromeConfirmedRef.current = true;
      }
    } finally {
      setIsChannelLoading(false);
    }
  }, [authContext, offlineModeEnabled, podcastId]);

  useEffect(() => {
    void loadChannel();
  }, [loadChannel]);

  useEffect(() => {
    if (getCachedChannelSectionFlags(podcastId) !== null) {
      return;
    }

    let isMounted = true;

    void sectionChromeFlagsRepository.getChannel(podcastId).then((flags) => {
      if (!isMounted || flags === null || chromeConfirmedRef.current) {
        return;
      }
      setHasSoundbites(flags.hasOfficialClips);
      setPreviewHasPodroll(flags.hasPodroll);
      setHasCheckedSoundbites(true);
    });

    return () => {
      isMounted = false;
    };
  }, [podcastId]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const subscribed = await subscriptionsRepository.isSubscribed(podcastId);
      if (isMounted) {
        setIsSubscribed(subscribed);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [podcastId]);

  /**
   * Deep links (and any navigate that omitted preview) still get list chrome from SQLite when this
   * device already follows the channel. Route preview wins on first paint; this only fills gaps.
   */
  useEffect(() => {
    if (previewHeaderTitle !== null && previewArtworkUri !== null) {
      return;
    }

    let isMounted = true;

    void (async () => {
      const local = await subscriptionsRepository.getByIdText(podcastId);
      if (!isMounted || local === null) {
        return;
      }
      if (previewHeaderTitle === null && local.title.length > 0) {
        setPreviewHeaderTitle(local.title);
      }
      if (previewArtworkUri === null && local.imageUrl !== null && local.imageUrl.length > 0) {
        setPreviewArtworkUri(local.imageUrl);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [podcastId, previewArtworkUri, previewHeaderTitle]);

  /**
   * Keyed on the channel, so arriving at a second podcast opens on that podcast's section and order
   * rather than on whatever the previous one was left showing.
   */
  useEffect(() => {
    let isMounted = true;
    setIsSectionHydrated(false);

    void (async () => {
      const prefs = await readPodcastDetailPrefs(podcastId);
      if (!isMounted) {
        return;
      }
      // Offline Mode wins over the remembered tab on arrival; the stored pref is left alone.
      setSection(
        isOfflineModeEnabled()
          ? resolvePodcastSectionForOfflineMode(prefs.tab, [
              'about',
              'clips',
              'downloaded',
              'episodes',
            ])
          : prefs.tab
      );
      setSort(prefs.sort);
      setRange(prefs.range);
      setIsSectionHydrated(true);
    })();

    return () => {
      isMounted = false;
    };
  }, [podcastId]);

  /**
   * Opening the channel is what marks it seen — there is no per-episode seen state.
   *
   * Written straight to the device rather than through the sync queue, so the badge clears as the
   * screen appears whatever the network is doing. The next reconciliation carries the timestamp to
   * the account, and because seen state only moves forward, a failed one costs nothing.
   *
   * Keyed on the channel alone so returning from an episode does not re-stamp it.
   */
  useEffect(() => {
    void channelSeenRepository.markSeen(podcastId, 'channel');
  }, [podcastId]);

  const { handleGateError, openGate } = useMembershipGate();
  const { evaluateFeature } = useAccessTier();
  const notifications = useChannelNotifications({
    channelId: channel?.id ?? null,
    channelIdText: podcastId,
  });

  const isSignedIn = status === 'authenticated';
  /**
   * Settings are offered once there is something to settle: an account to hold the choices and a
   * subscription that makes them worth holding.
   */
  const canOpenSettings = isSignedIn && isSubscribed;
  const notificationsEnabled = notifications.isEnabled;
  const toggleNotifications = notifications.toggleEnabled;

  const handleShare = useCallback(() => {
    shareResolvedUrl(buildPublicShareUrl('podcast', podcastId));
  }, [podcastId]);

  const openExternalUrl = useCallback(async (href: string) => {
    try {
      await Linking.openURL(href);
    } catch {
      // The controls are optional conveniences; failing to open leaves the screen usable.
    }
  }, []);

  const feedUrl = channel?.feed?.url ?? null;
  const websiteUrl = channel?.channel_about?.website_link_url ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canOpenSettings
        ? () => (
            <HeaderBarAction
              accessibilityLabel={t('nav.stack.podcast_settings')}
              icon="settings-outline"
              onPress={() => {
                navigation.navigate('PodcastSettings', { podcastId });
              }}
              testID="podcast-detail-settings"
            />
          )
        : undefined,
    });
  }, [canOpenSettings, navigation, podcastId, t]);

  /**
   * Subscribing has three behaviors and unsubscribing has one.
   *
   * Signed out, the local write *is* the subscription and nothing reaches the server. Signed in the
   * account is the source of truth, so the follow goes to the server first and the local row is
   * written only once it sticks — otherwise the next account sync would silently erase it. A
   * membership denial is definitive and leaves nothing behind locally.
   *
   * Unsubscribing is never gated, in any tier or membership state. The local removal happens first
   * and stands even if the server call fails.
   */
  const handleSubscriptionToggle = useCallback(async () => {
    if (isSavingSubscription) {
      return;
    }

    setIsSavingSubscription(true);
    setSubscriptionNoticeKey(null);
    try {
      if (isSubscribed) {
        const result = await subscriptionsRepository.unsubscribe({
          accountSync: isSignedIn ? authContext : undefined,
          idText: podcastId,
          source: 'directory',
        });
        setIsSubscribed(false);
        homeFeedRefresh.notify();
        if (result.serverError) {
          setSubscriptionNoticeKey('errors.generic');
        }
        return;
      }

      const entry = channel === null ? null : mapDirectoryChannelToSubscribed(channel);
      if (entry === null) {
        setSubscriptionNoticeKey('errors.generic');
        return;
      }

      if (isSignedIn) {
        const access = evaluateFeature('subscribe_sync');
        if (!access.allowed) {
          openGate(access.reason);
          return;
        }

        try {
          await requestWithMobileAuthRefresh(authContext, async (api) =>
            api.reqAccountFollowChannel({ channel_id_text: podcastId })
          );
        } catch (error) {
          if (handleGateError(error)) {
            return;
          }
          setSubscriptionNoticeKey('errors.generic');
          return;
        }
      }

      await subscriptionsRepository.subscribeLocal(entry);
      setIsSubscribed(true);
      homeFeedRefresh.notify();
    } finally {
      setIsSavingSubscription(false);
    }
  }, [
    authContext,
    channel,
    evaluateFeature,
    handleGateError,
    isSavingSubscription,
    isSignedIn,
    isSubscribed,
    openGate,
    podcastId,
  ]);

  const availableSections = useMemo(
    () => resolvePodcastSections({ channel, hasSoundbites, previewHasPodroll }),
    [channel, hasSoundbites, previewHasPodroll]
  );

  /**
   * A remembered section still has to exist on this podcast — one whose feed has dropped its
   * podroll cannot open on it. The stored preference is left alone, so the section comes back if
   * the feed declares one again.
   *
   * Held until the channel and the stored episodes have both been read, because a cache miss must
   * not be treated as absence or a restored Official clips / Podroll pane would be thrown away.
   */
  useEffect(() => {
    if (channel === null || !hasCheckedSoundbites) {
      return;
    }
    if (!availableSections.includes(section)) {
      setSection(
        offlineModeEnabled
          ? resolvePodcastSectionForOfflineMode(section, availableSections)
          : DEFAULT_PODCAST_TAB
      );
    }
  }, [availableSections, channel, hasCheckedSoundbites, offlineModeEnabled, section]);

  /**
   * Turning Offline Mode on while already on this screen (or finishing hydrate after the mode
   * flag arrives) switches the chip to Downloaded. Display-only — the stored tab pref is not
   * overwritten. Manual chip taps while Offline Mode is on still update `section` without write.
   * Keyed on podcast identity so a later chrome update does not yank the chip back after a tap.
   */
  useEffect(() => {
    if (!offlineModeEnabled || !isSectionHydrated) {
      return;
    }
    setSection('downloaded');
  }, [isSectionHydrated, offlineModeEnabled, podcastId]);

  const handleSectionSelect = useCallback(
    (next: PodcastTab) => {
      setSection(next);
      if (!offlineModeEnabled) {
        void writePodcastDetailTab(podcastId, next);
      }
    },
    [offlineModeEnabled, podcastId]
  );

  const handleSortSelect = useCallback(
    (next: PodcastDetailSort) => {
      setSort(next);
      void writePodcastDetailSort(podcastId, next);
    },
    [podcastId]
  );

  const handleRangeSelect = useCallback(
    (next: PodcastDetailRange) => {
      setRange(next);
      void writePodcastDetailRange(podcastId, next);
    },
    [podcastId]
  );

  const sectionChips = useMemo<SectionChipItem<PodcastTab>[]>(
    () =>
      availableSections.map((available) => ({
        key: available,
        label: t(PODCAST_SECTION_LABEL_KEYS[available]),
        testID: `podcast-detail-section-${available}`,
      })),
    [availableSections, t]
  );

  const sortOptions = useMemo<MenuSelectChipOption<PodcastDetailSort>[]>(
    () =>
      PODCAST_DETAIL_SORT_OPTIONS.map((option) => ({
        label: t(SORT_LABEL_KEYS[option]),
        value: option,
      })),
    [t]
  );

  const rangeOptions = useMemo<MenuSelectChipOption<PodcastDetailRange>[]>(
    () =>
      PODCAST_DETAIL_RANGE_OPTIONS.map((option) => ({
        label: t(RANGE_LABEL_KEYS[option]),
        value: option,
      })),
    [t]
  );

  const channelArtworkUri = primaryChannelListArtworkUrl(channel?.channel_images);
  const artworkUri = channelArtworkUri ?? previewArtworkUri;
  const headerTitle = channel?.title ?? previewHeaderTitle ?? t('media.podcast.podcast');
  const sortEnabled = isSortableSection(section);
  const channelHeader = (
    <ChannelHeader
      actions={
        <View style={styles.channelActions}>
          <View style={styles.subscribeButtonRow}>
            <Button
              label={t(isSubscribed ? 'features.unsubscribe' : 'features.subscribe')}
              loading={isSavingSubscription}
              onPress={() => {
                void handleSubscriptionToggle();
              }}
              size="sm"
              testID="podcast-detail-subscribe-toggle"
              variant="outline"
            />
          </View>
          <View style={styles.channelActionRow}>
            <HeaderBarAction
              accessibilityLabel={t(
                notificationsEnabled
                  ? 'features.notifications.disable_notifications_for_this_podcast'
                  : 'features.notifications.enable_notifications_for_this_podcast'
              )}
              icon={notificationsEnabled ? 'notifications' : 'notifications-off-outline'}
              onPress={() => {
                void toggleNotifications();
              }}
              testID="podcast-detail-notifications-toggle"
            />
            <HeaderBarAction
              accessibilityLabel={t('features.share')}
              icon="share-outline"
              onPress={handleShare}
              testID="podcast-detail-share"
            />
            {feedUrl !== null && feedUrl.length > 0 ? (
              <HeaderBarAction
                accessibilityLabel={t('info.rss_feed')}
                icon="logo-rss"
                onPress={() => {
                  void openExternalUrl(feedUrl);
                }}
                testID="podcast-detail-rss"
              />
            ) : null}
            {websiteUrl !== null && websiteUrl.length > 0 ? (
              <HeaderBarAction
                accessibilityLabel={t('info.website')}
                icon="globe-outline"
                onPress={() => {
                  void openExternalUrl(websiteUrl);
                }}
                testID="podcast-detail-website"
              />
            ) : null}
          </View>
        </View>
      }
      artworkUri={artworkUri}
      notice={subscriptionNoticeKey === null ? null : t(subscriptionNoticeKey)}
      testID="podcast-detail-header"
      title={headerTitle}
      viewerUri={primaryChannelLightboxArtworkUrl(channel?.channel_images) ?? artworkUri}
    />
  );

  const listHeader = isFilterableSection(section) ? (
    <ListFilterField
      clearLabel={t('filters.list.clear')}
      label={t('filters.list.title_label')}
      onChangeTerm={setFilterTerm}
      placeholder={t('filters.list.placeholder')}
      term={filterTerm}
      testID="podcast-detail-filter"
    />
  ) : null;

  const SectionPane = SECTION_COMPONENTS[section];
  const sectionUnavailableOffline =
    offlineModeEnabled && isPodcastSectionUnavailableOffline(section);
  const sectionBody = sectionUnavailableOffline ? (
    <ListEmpty
      messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
      testID="podcast-detail-offline-unavailable"
    />
  ) : (
    <SectionPane
      channel={channel}
      channelIdText={podcastId}
      filterTerm={filterTerm}
      isChannelLoading={isChannelLoading}
      listHeader={listHeader}
      onRefreshChannel={loadChannel}
      range={range}
      sort={sort}
    />
  );

  const chipLeading = sortEnabled ? (
    <>
      <MenuSelectChip
        heading={t('filters.screen.sort_heading')}
        onSelect={handleSortSelect}
        options={sortOptions}
        testID="podcast-detail-sort"
        value={sort}
      />
      {sort === 'top' ? (
        <MenuSelectChip
          heading={t('filters.screen.range_heading')}
          onSelect={handleRangeSelect}
          options={rangeOptions}
          testID="podcast-detail-range"
          value={range}
        />
      ) : null}
    </>
  ) : undefined;

  return (
    <ChannelDetailShell
      channelHeader={channelHeader}
      chipLeading={chipLeading}
      isSectionHydrated={isSectionHydrated}
      loadingTestID="podcast-detail-section-loading"
      onSelectSection={handleSectionSelect}
      sectionBody={sectionBody}
      sectionChips={sectionChips}
      sectionsTestID="podcast-detail-sections"
      selectedSection={section}
      testID="podcast-detail-screen"
    />
  );
}
