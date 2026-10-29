import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DTOAccountNotification } from '@podverse/helpers';
import {
  accountNotificationImageUrl,
  applyNotificationVisitUnread,
  formatAccountNotificationLine,
  formatRelativeTimeLabel,
} from '@podverse/helpers';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import { CoverImage } from '../../components/primitives/CoverImage';
import { FillList } from '../../components/primitives/FillList';
import { VerticalCenter } from '../../components/primitives/VerticalCenter';
import { HeaderBarChrome } from '../../components/screen/HeaderBarChrome';
import { CallToActionSection } from '../../components/state/CallToActionSection';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { LoadingSection } from '../../components/state/LoadingSection';
import { RetryableError } from '../../components/state/RetryableError';
import { notificationsRepository } from '../../data/repositories';
import { useLoadMoreOnEndReached } from '../../hooks/useLoadMoreOnEndReached';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import {
  appendUniqueBy,
  canLoadNextPage,
  LIST_END_REACHED_THRESHOLD,
} from '../../lib/pagination/pagedList';
import type { RootStackParamList } from '../../navigation';
import { ROOT_STACK_ROUTES } from '../../navigation';
import { accountNotificationLineLabels } from '../../notifications/accountNotificationLineLabels';
import { markNotificationReadById } from '../../notifications/notificationReadActions';
import {
  getNotificationsInboxCache,
  prependLiveNotification,
  setNotificationsInboxCache,
} from '../../notifications/notificationsInboxCache';
import {
  markNotificationsInboxFocused,
  setNotificationUnreadCount,
  subscribeNotificationStreamEvents,
} from '../../notifications/notificationStreamStore';
import { useOfflineMode } from '../../prefs/offlineMode';
import { openAccountNotificationLink } from '../../push/openAccountNotificationLink';
import {
  listRowArtworkGap,
  NOTIFICATION_INBOX_ARTWORK_SIZE,
  screenBodyInsets,
} from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

const FIRST_PAGE = 1;

type NotificationsInboxScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'NotificationsInbox'
>;

const inboxRowKeyExtractor = (item: DTOAccountNotification): string => String(item.id);

const createInboxRowStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    artwork: {
      borderWidth: 0,
      height: NOTIFICATION_INBOX_ARTWORK_SIZE,
      width: NOTIFICATION_INBOX_ARTWORK_SIZE,
    },
    entry: {
      alignItems: 'center',
      borderRadius: 0,
      flexDirection: 'row',
      gap: tokens.spacing.md,
    },
    copy: {
      flex: 1,
      flexDirection: 'column',
      gap: tokens.spacing.xs,
    },
    line: {
      ...typography.body,
      color: themeStyles.textPrimary.color,
    },
    row: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: listRowArtworkGap(tokens.spacing),
    },
    separator: {
      borderRadius: 0,
      borderTopColor: themeStyles.border.borderColor,
      borderTopWidth: StyleSheet.hairlineWidth,
      marginTop: tokens.spacing.lg,
      paddingTop: tokens.spacing.lg,
    },
    time: {
      ...typography.caption,
      color: themeStyles.textSecondary.color,
    },
    unreadDot: {
      backgroundColor: tokens.text.accent,
      borderRadius: tokens.radii.round,
      height: tokens.spacing.md,
      width: tokens.spacing.md,
    },
    unreadSlot: {
      height: tokens.spacing.md,
      width: tokens.spacing.md,
    },
  });

function InboxNotificationSeparator() {
  const styles = useThemedStyles(createInboxRowStyles);
  return <View style={styles.separator} />;
}

function InboxNotificationRow({
  item,
  onPress,
}: {
  item: DTOAccountNotification;
  onPress: (notification: DTOAccountNotification) => void;
}) {
  const { i18n, t } = useTranslation();
  const styles = useThemedStyles(createInboxRowStyles);
  const handlePress = useCallback(() => {
    void onPress(item);
  }, [item, onPress]);
  const line = formatAccountNotificationLine(item, accountNotificationLineLabels(t));
  const timeLabel = formatRelativeTimeLabel(item.created_at, i18n.language);
  const unreadLabel = item.is_unread ? t('notifications_page.unread') : '';
  const accessibilityLabel = [unreadLabel, line, timeLabel]
    .filter((part) => part !== '')
    .join(', ');

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={handlePress}
      style={styles.entry}
      testID={`notifications-inbox-row-${item.id}`}
    >
      <View style={styles.unreadSlot}>
        {item.is_unread ? <View style={styles.unreadDot} /> : null}
      </View>
      <View style={styles.row}>
        <CoverImage
          decodeEdge={NOTIFICATION_INBOX_ARTWORK_SIZE}
          opensViewer={false}
          style={styles.artwork}
          uri={accountNotificationImageUrl(item.payload)}
        />
        <View style={styles.copy}>
          <Text numberOfLines={2} style={styles.line}>
            {line}
          </Text>
          {timeLabel !== '' ? (
            <Text numberOfLines={1} style={styles.time}>
              {timeLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function NotificationsInboxScreen({ navigation }: NotificationsInboxScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { onRequestLogin } = useAuthPrompt();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { styles: themeStyles, tokens } = useTheme();
  const [notifications, setNotifications] = useState<DTOAccountNotification[]>(
    () => getNotificationsInboxCache()?.items ?? []
  );
  const [isLoading, setIsLoading] = useState(() => getNotificationsInboxCache() === null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [loadMoreErrorKey, setLoadMoreErrorKey] = useState<string | null>(null);
  const [page, setPage] = useState(() => getNotificationsInboxCache()?.page ?? FIRST_PAGE);
  const [totalPages, setTotalPages] = useState(
    () => getNotificationsInboxCache()?.totalPages ?? FIRST_PAGE
  );

  const requestContext = useMemo(() => {
    return {
      accessToken,
      clearSession,
      refreshToken,
      setTokens,
    };
  }, [accessToken, clearSession, refreshToken, setTokens]);

  const statusRef = useRef(status);
  const offlineModeEnabledRef = useRef(offlineModeEnabled);
  const requestContextRef = useRef(requestContext);
  const isFirstPageLoadingRef = useRef(false);
  const liveRowsDuringLoadRef = useRef<DTOAccountNotification[]>([]);
  const inboxGenerationRef = useRef(0);
  const visitUnreadIdsRef = useRef<ReadonlySet<number>>(new Set<number>());
  statusRef.current = status;
  offlineModeEnabledRef.current = offlineModeEnabled;
  requestContextRef.current = requestContext;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        content: {
          ...screenBodyInsets(tokens.spacing),
          paddingBottom: tokens.spacing.lg + insets.bottom,
        },
        listFooter: {
          marginTop: tokens.spacing.lg,
        },
      }),
    [insets.bottom, themeStyles, tokens]
  );

  const handleDismiss = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROOT_STACK_ROUTES.MainTabs);
  }, [navigation]);

  const loadPage = useCallback(
    async (nextPage: number, mode: 'replace' | 'append') => {
      if (status !== 'authenticated') {
        setNotifications([]);
        setPage(FIRST_PAGE);
        setTotalPages(FIRST_PAGE);
        setErrorKey(null);
        setLoadMoreErrorKey(null);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      if (offlineModeEnabled) {
        const cached = getNotificationsInboxCache();
        if (cached !== null) {
          const visit = applyNotificationVisitUnread(visitUnreadIdsRef.current, cached.items);
          visitUnreadIdsRef.current = visit.visitUnreadIds;
          setNotifications(visit.rows);
          setPage(cached.page);
          setTotalPages(cached.totalPages);
        }
        setErrorKey(null);
        setLoadMoreErrorKey(null);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      if (mode === 'replace') {
        inboxGenerationRef.current += 1;
        setLoadMoreErrorKey(null);
        setIsLoading(true);
        setErrorKey(null);
      } else {
        setIsLoadingMore(true);
        setLoadMoreErrorKey(null);
      }

      const generation = inboxGenerationRef.current;

      try {
        const nextData = await notificationsRepository.list(requestContext, { page: nextPage });
        if (mode === 'append' && generation !== inboxGenerationRef.current) {
          return;
        }
        const visit = applyNotificationVisitUnread(visitUnreadIdsRef.current, nextData.items);
        visitUnreadIdsRef.current = visit.visitUnreadIds;
        setNotifications((previous) =>
          mode === 'replace'
            ? visit.rows
            : appendUniqueBy(previous, visit.rows, inboxRowKeyExtractor)
        );
        setPage(nextData.page);
        setTotalPages(nextData.totalPages);
        const cached = getNotificationsInboxCache();
        if (mode === 'replace') {
          setNotificationsInboxCache({
            items: nextData.items,
            page: nextData.page,
            totalPages: nextData.totalPages,
            unreadCount: nextData.unreadCount,
          });
        } else {
          setNotificationsInboxCache({
            items: appendUniqueBy(cached?.items ?? [], nextData.items, inboxRowKeyExtractor),
            page: nextData.page,
            totalPages: nextData.totalPages,
            unreadCount: nextData.unreadCount,
          });
        }
      } catch (error) {
        console.warn('Could not load notifications page', error);
        if (mode === 'append') {
          if (generation !== inboxGenerationRef.current) {
            return;
          }
          setLoadMoreErrorKey('errors.generic');
        } else {
          setNotifications([]);
          setErrorKey('errors.generic');
        }
      } finally {
        if (mode === 'replace') {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [offlineModeEnabled, requestContext, status]
  );

  const loadFirstPageAndMarkRead = useCallback(async () => {
    inboxGenerationRef.current += 1;
    setLoadMoreErrorKey(null);

    if (status !== 'authenticated') {
      setNotifications([]);
      setPage(FIRST_PAGE);
      setTotalPages(FIRST_PAGE);
      setErrorKey(null);
      setLoadMoreErrorKey(null);
      setIsLoading(false);
      return;
    }

    if (offlineModeEnabled) {
      const cached = getNotificationsInboxCache();
      if (cached !== null) {
        const visit = applyNotificationVisitUnread(visitUnreadIdsRef.current, cached.items);
        visitUnreadIdsRef.current = visit.visitUnreadIds;
        setNotifications(visit.rows);
        setPage(cached.page);
        setTotalPages(cached.totalPages);
      }
      setErrorKey(null);
      setLoadMoreErrorKey(null);
      setIsLoading(false);
      return;
    }

    isFirstPageLoadingRef.current = true;
    liveRowsDuringLoadRef.current = [];
    setIsLoading(true);
    setErrorKey(null);
    try {
      const nextData = await notificationsRepository.list(requestContext, { page: FIRST_PAGE });
      const withHeld = (rows: DTOAccountNotification[]): DTOAccountNotification[] => {
        let next = rows;
        for (const held of liveRowsDuringLoadRef.current) {
          next = prependLiveNotification(next, held);
        }
        return next;
      };
      const items = withHeld(nextData.items);
      const visit = applyNotificationVisitUnread(visitUnreadIdsRef.current, items);
      visitUnreadIdsRef.current = visit.visitUnreadIds;
      setNotifications(visit.rows);
      setPage(nextData.page);
      setTotalPages(nextData.totalPages);
      let marked = false;
      try {
        await notificationsRepository.markRead(requestContext);
        setNotificationUnreadCount(0);
        marked = true;
      } catch (error) {
        console.warn('Could not mark notifications read', error);
      }
      const cachedItems = withHeld(items);
      setNotificationsInboxCache({
        items: marked
          ? cachedItems.map((item) => (item.is_unread ? { ...item, is_unread: false } : item))
          : cachedItems,
        page: nextData.page,
        totalPages: nextData.totalPages,
        unreadCount: marked ? 0 : nextData.unreadCount,
      });
    } catch (error) {
      console.warn('Could not refresh notifications inbox', error);
      setNotifications([]);
      setErrorKey('errors.generic');
    } finally {
      isFirstPageLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [offlineModeEnabled, requestContext, status]);

  const loadFirstPageAndMarkReadRef = useRef(loadFirstPageAndMarkRead);
  loadFirstPageAndMarkReadRef.current = loadFirstPageAndMarkRead;

  useFocusEffect(
    useCallback(() => {
      visitUnreadIdsRef.current = new Set<number>();
      const releaseInboxFocus = markNotificationsInboxFocused();
      const unsubscribe = subscribeNotificationStreamEvents((event) => {
        if (event.type === 'created') {
          if (statusRef.current !== 'authenticated' || offlineModeEnabledRef.current) {
            return;
          }
          const notification = event.notification;
          const visit = applyNotificationVisitUnread(visitUnreadIdsRef.current, [notification]);
          visitUnreadIdsRef.current = visit.visitUnreadIds;
          setNotifications((items) => prependLiveNotification(items, notification));
          const cached = getNotificationsInboxCache();
          if (cached !== null) {
            setNotificationsInboxCache({
              ...cached,
              items: prependLiveNotification(cached.items, {
                ...notification,
                is_unread: false,
              }),
            });
          }
          if (isFirstPageLoadingRef.current) {
            liveRowsDuringLoadRef.current.push(notification);
          }
          void markNotificationReadById(requestContextRef.current, notification.id);
          return;
        }
        if (event.type === 'resync') {
          if (!isFirstPageLoadingRef.current) {
            void loadFirstPageAndMarkReadRef.current();
          }
          return;
        }
      });
      return () => {
        unsubscribe();
        releaseInboxFocus();
        visitUnreadIdsRef.current = new Set<number>();
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      void loadFirstPageAndMarkRead();
    }, [loadFirstPageAndMarkRead])
  );

  const handleNotificationPress = useCallback((notification: DTOAccountNotification) => {
    void openAccountNotificationLink(notification);
  }, []);

  const canLoadMore = page < totalPages;
  const hasRows = notifications.length > 0;

  const handleEndReached = useLoadMoreOnEndReached({
    canLoadMore:
      status === 'authenticated' &&
      !offlineModeEnabled &&
      canLoadNextPage({
        hasError: errorKey !== null || loadMoreErrorKey !== null,
        hasMore: canLoadMore,
        isLoading,
        isLoadingMore,
      }),
    loadMore: () => loadPage(page + 1, 'append'),
  });

  const handleRetryNextPage = useCallback(() => {
    void loadPage(page + 1, 'append');
  }, [loadPage, page]);

  const handleRetryInbox = useCallback(() => {
    void loadFirstPageAndMarkRead();
  }, [loadFirstPageAndMarkRead]);

  const listEmpty = useMemo(
    () =>
      isLoading ? (
        <LoadingSection testID="notifications-inbox-loading" />
      ) : status !== 'authenticated' ? (
        <CallToActionSection
          actionLabelKey="authentication.login"
          messageKey="authentication.login_required"
          onAction={onRequestLogin}
          testID="notifications-inbox-auth-required"
        />
      ) : offlineModeEnabled && getNotificationsInboxCache() === null ? (
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID="notifications-inbox-offline-unavailable"
        />
      ) : errorKey !== null ? (
        <VerticalCenter>
          <RetryableError
            errorKey={errorKey}
            onRetry={handleRetryInbox}
            testID="notifications-inbox-error"
          />
        </VerticalCenter>
      ) : (
        <VerticalCenter>
          <ListEmpty messageKey="notifications_page.empty" testID="notifications-inbox-empty" />
        </VerticalCenter>
      ),
    [errorKey, handleRetryInbox, isLoading, offlineModeEnabled, onRequestLogin, status]
  );

  const listFooter = useMemo(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.listFooter}>
          <ListLoading testID="notifications-inbox-loading-more" />
        </View>
      );
    }

    if (loadMoreErrorKey !== null && hasRows && !offlineModeEnabled) {
      return (
        <View style={styles.listFooter}>
          <ListError
            messageKey={loadMoreErrorKey}
            onRetry={handleRetryNextPage}
            testID="notifications-inbox-load-more-error"
          />
        </View>
      );
    }

    return null;
  }, [
    handleRetryNextPage,
    hasRows,
    isLoadingMore,
    loadMoreErrorKey,
    offlineModeEnabled,
    styles.listFooter,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: DTOAccountNotification }) => (
      <InboxNotificationRow item={item} onPress={handleNotificationPress} />
    ),
    [handleNotificationPress]
  );

  return (
    <View style={styles.container} testID="notifications-inbox-screen">
      <HeaderBarChrome
        backAccessibilityLabel={t('misc.dismiss')}
        backIcon="chevron-down"
        backTestID="notifications-inbox-dismiss"
        onBack={handleDismiss}
        title={t('nav.tab.notifications')}
      />
      <FillList
        ItemSeparatorComponent={InboxNotificationSeparator}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.content}
        data={notifications}
        keyExtractor={inboxRowKeyExtractor}
        onEndReached={handleEndReached}
        onEndReachedThreshold={LIST_END_REACHED_THRESHOLD}
        renderItem={renderItem}
      />
    </View>
  );
}
