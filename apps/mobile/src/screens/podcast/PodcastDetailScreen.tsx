import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { DTOChannel } from '@podverse/helpers';
import { primaryChannelLightboxArtworkUrl, primaryChannelListArtworkUrl } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { ChannelHeader } from '../../components/channel';
import type { MenuSelectChipOption, SectionChipItem } from '../../components/form';
import { ListFilterField, MenuSelectChip, SectionChipRow } from '../../components/form';
import { Button } from '../../components/primitives/Button';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { channelSeenRepository } from '../../data/repositories/channelSeenRepository';
import { mapDirectoryChannelToSubscribed } from '../../data/repositories/subscriptionsMerge';
import { subscriptionsRepository } from '../../data/repositories/subscriptionsRepository';
import { useChannelNotifications } from '../../hooks/useChannelNotifications';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
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
import { listFilterFieldBottomMargin, listHeaderStackGap } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import {
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
  episodes: PodcastEpisodesSection,
  podroll: PodcastPodrollSection,
  soundbites: PodcastOfficialClipsSection,
};

/**
 * A podcast, as one column at every width.
 *
 * The screen owns identity and controls — the channel, the subscribe state, which section is
 * showing and how it is ordered — and hands them to the active section as a header. The section
 * owns its own list, because the sections answer to different endpoints and different row shapes,
 * and a single list that tried to serve all of them would branch on section in every callback.
 *
 * Actions on the channel as a whole (share, notifications, settings) belong in the stack header
 * rather than in the body, so they stay reachable while the list is scrolled.
 */
export function PodcastDetailScreen({ navigation, route }: PodcastDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [hasSoundbites, setHasSoundbites] = useState<boolean>(false);
  const [hasCheckedSoundbites, setHasCheckedSoundbites] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isSavingSubscription, setIsSavingSubscription] = useState<boolean>(false);
  const [subscriptionNoticeKey, setSubscriptionNoticeKey] = useState<string | null>(null);
  const [section, setSection] = useState<PodcastTab>(DEFAULT_PODCAST_TAB);
  const [sort, setSort] = useState<PodcastDetailSort>(DEFAULT_PODCAST_DETAIL_SORT);
  const [range, setRange] = useState<PodcastDetailRange>(DEFAULT_PODCAST_DETAIL_RANGE);
  /**
   * Free text lives only as long as the screen does. A remembered filter would reopen a podcast
   * showing a fraction of its episodes with no hint why, so unlike the section and the order this
   * one is deliberately not carried anywhere.
   */
  const [filterTerm, setFilterTerm] = useState<string>('');
  const { podcastId } = route.params;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chipRow: {
          marginTop: listHeaderStackGap(tokens.spacing),
        },
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        filterRow: {
          marginBottom: listFilterFieldBottomMargin(tokens.spacing, tokens.spacing.base),
          marginTop: listHeaderStackGap(tokens.spacing),
        },
        headerActions: {
          alignItems: 'center',
          flexDirection: 'row',
        },
      }),
    [themeStyles, tokens]
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
    const soundbites = await readHasStoredSoundbites(podcastId);
    setHasSoundbites(soundbites);
    setHasCheckedSoundbites(true);

    try {
      const response = await requestWithMobileAuthRefresh(authContext, async (api) =>
        api.reqChannelGetByIdOrIdText(podcastId)
      );
      setChannel(response);
    } catch {
      // The sections still have the stored window to show, and they report their own failures.
    }
  }, [authContext, podcastId]);

  useEffect(() => {
    void loadChannel();
  }, [loadChannel]);

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
   * Keyed on the channel, so arriving at a second podcast opens on that podcast's section and order
   * rather than on whatever the previous one was left showing.
   */
  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const prefs = await readPodcastDetailPrefs(podcastId);
      if (isMounted) {
        setSection(prefs.tab);
        setSort(prefs.sort);
        setRange(prefs.range);
      }
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
   * Settings are only offered once there is something to settle: an account to hold the choices and
   * a subscription that makes them worth holding. The bell and share stay unconditional, so a
   * signed-out visitor still has both a way to pass the podcast on and a way to find out what
   * following it would give them.
   */
  const canOpenSettings = isSignedIn && isSubscribed;
  const notificationsEnabled = notifications.isEnabled;
  const toggleNotifications = notifications.toggleEnabled;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <HeaderBarAction
            accessibilityLabel={t('features.share')}
            icon="share-outline"
            onPress={() => {
              shareResolvedUrl(buildPublicShareUrl('podcast', podcastId));
            }}
            testID="podcast-detail-share"
          />
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
          {canOpenSettings ? (
            <HeaderBarAction
              accessibilityLabel={t('nav.stack.podcast_settings')}
              icon="settings-outline"
              onPress={() => {
                navigation.navigate('PodcastSettings', { podcastId });
              }}
              testID="podcast-detail-settings"
            />
          ) : null}
        </View>
      ),
    });
  }, [
    canOpenSettings,
    navigation,
    notificationsEnabled,
    podcastId,
    styles.headerActions,
    t,
    toggleNotifications,
  ]);

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
        await subscriptionsRepository.unsubscribeLocal(podcastId);
        setIsSubscribed(false);
        homeFeedRefresh.notify();

        if (isSignedIn) {
          try {
            await requestWithMobileAuthRefresh(authContext, async (api) =>
              api.reqAccountUnfollowChannel({ channel_id_text: podcastId })
            );
          } catch {
            // The local removal stands; the account catches up on the next successful unsubscribe.
            setSubscriptionNoticeKey('errors.generic');
          }
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
    () => resolvePodcastSections({ channel, hasSoundbites }),
    [channel, hasSoundbites]
  );

  /**
   * A remembered section still has to exist on this podcast — one whose feed has dropped its
   * podroll cannot open on it. The stored preference is left alone, so the section comes back if
   * the feed declares one again.
   *
   * Held until the channel and the stored episodes have both been read, because until then the
   * conditional sections look absent and a restored choice would be discarded before the screen
   * could honour it.
   */
  useEffect(() => {
    if (channel === null || !hasCheckedSoundbites) {
      return;
    }
    if (!availableSections.includes(section)) {
      setSection(DEFAULT_PODCAST_TAB);
    }
  }, [availableSections, channel, hasCheckedSoundbites, section]);

  const handleSectionSelect = useCallback(
    (next: PodcastTab) => {
      setSection(next);
      void writePodcastDetailTab(podcastId, next);
    },
    [podcastId]
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

  const artworkUri = primaryChannelListArtworkUrl(channel?.channel_images);
  const sortEnabled = isSortableSection(section);

  const listHeader = (
    <>
      <ChannelHeader
        actions={
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
        }
        artworkUri={artworkUri}
        notice={subscriptionNoticeKey === null ? null : t(subscriptionNoticeKey)}
        testID="podcast-detail-header"
        title={channel?.title ?? t('media.podcast.podcast')}
        viewerUri={primaryChannelLightboxArtworkUrl(channel?.channel_images) ?? artworkUri}
      />
      <View style={styles.chipRow}>
        <SectionChipRow
          items={sectionChips}
          leading={
            <>
              <MenuSelectChip
                disabled={!sortEnabled}
                heading={t('filters.screen.sort_heading')}
                onSelect={handleSortSelect}
                options={sortOptions}
                testID="podcast-detail-sort"
                value={sort}
              />
              {sort === 'top' ? (
                <MenuSelectChip
                  disabled={!sortEnabled}
                  heading={t('filters.screen.range_heading')}
                  onSelect={handleRangeSelect}
                  options={rangeOptions}
                  testID="podcast-detail-range"
                  value={range}
                />
              ) : null}
            </>
          }
          onSelect={handleSectionSelect}
          selectedKey={section}
          testID="podcast-detail-sections"
        />
      </View>
      {isFilterableSection(section) ? (
        <ListFilterField
          clearLabel={t('filters.list.clear')}
          label={t('filters.list.title_label')}
          onChangeTerm={setFilterTerm}
          placeholder={t('filters.list.placeholder')}
          style={styles.filterRow}
          term={filterTerm}
          testID="podcast-detail-filter"
        />
      ) : null}
    </>
  );

  const SectionPane = SECTION_COMPONENTS[section];

  return (
    <View style={styles.container} testID="podcast-detail-screen">
      <SectionPane
        channel={channel}
        channelIdText={podcastId}
        filterTerm={filterTerm}
        listHeader={listHeader}
        onRefreshChannel={loadChannel}
        range={range}
        sort={sort}
      />
    </View>
  );
}
