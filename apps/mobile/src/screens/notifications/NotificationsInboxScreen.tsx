import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOAccountNotification } from '@podverse/helpers';
import { getRelativeTimeParts, NotificationCategoryEnum } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import { Card } from '../../components/primitives/Card';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListLoading } from '../../components/state/ListLoading';
import { RetryableError } from '../../components/state/RetryableError';
import { getMobileConfig } from '../../config';
import { notificationsRepository } from '../../data/repositories';
import { emitNotificationsReadEvent } from '../../hooks/useNotificationsUnreadCount';
import type { NotificationsStackParamList } from '../../navigation';
import { useTheme } from '../../theme/useTheme';

const FIRST_PAGE = 1;
const CATEGORY_LABEL_KEYS: Record<NotificationCategoryEnum, string> = {
  [NotificationCategoryEnum.General]: 'settings.notifications.category_general',
  [NotificationCategoryEnum.Livestream]: 'settings.notifications.category_livestream',
  [NotificationCategoryEnum.Maintenance]: 'settings.notifications.category_maintenance',
  [NotificationCategoryEnum.NewContent]: 'settings.notifications.category_new_content',
  [NotificationCategoryEnum.ProductUpdate]: 'settings.notifications.category_product_update',
  [NotificationCategoryEnum.TermsOfService]: 'settings.notifications.category_terms_of_service',
};

type NotificationsInboxScreenProps = NativeStackScreenProps<
  NotificationsStackParamList,
  'NotificationsInbox'
>;

export function NotificationsInboxScreen(_props: NotificationsInboxScreenProps) {
  const { t, i18n } = useTranslation();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { styles: themeStyles, tokens } = useTheme();
  const [notifications, setNotifications] = useState<DTOAccountNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(FIRST_PAGE);
  const [totalPages, setTotalPages] = useState(FIRST_PAGE);

  const requestContext = useMemo(() => {
    return {
      accessToken,
      clearSession,
      refreshToken,
      setTokens,
    };
  }, [accessToken, clearSession, refreshToken, setTokens]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
        },
        category: {
          color: tokens.text.accent,
          fontSize: 12,
          fontWeight: '600',
          marginTop: tokens.spacing.xs,
        },
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        content: {
          padding: tokens.spacing.lg,
        },
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '700',
          marginBottom: tokens.spacing.md,
        },
        listFooter: {
          marginTop: tokens.spacing.lg,
        },
        loadMoreButton: {
          alignItems: 'center',
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.sm,
          borderWidth: 1,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        loadMoreLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          fontWeight: '600',
        },
        recentActivityNote: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginBottom: tokens.spacing.md,
        },
        rowCard: {
          marginBottom: tokens.spacing.sm,
        },
        sectionHeading: {
          color: themeStyles.textPrimary.color,
          fontSize: 15,
          fontWeight: '700',
          marginBottom: tokens.spacing.sm,
          marginTop: tokens.spacing.md,
        },
        time: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
          marginTop: tokens.spacing.xs,
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 15,
          fontWeight: '600',
        },
      }),
    [themeStyles, tokens]
  );

  const loadPage = useCallback(
    async (nextPage: number, mode: 'replace' | 'append') => {
      if (status !== 'authenticated') {
        setNotifications([]);
        setUnreadCount(0);
        setPage(FIRST_PAGE);
        setTotalPages(FIRST_PAGE);
        setErrorKey(null);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      if (mode === 'replace') {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setErrorKey(null);

      try {
        const nextData = await notificationsRepository.list(requestContext, { page: nextPage });
        setNotifications((previous) =>
          mode === 'replace' ? nextData.items : [...previous, ...nextData.items]
        );
        setUnreadCount(nextData.unreadCount);
        setPage(nextData.page);
        setTotalPages(nextData.totalPages);
      } catch (error) {
        console.warn('Could not load notifications page', error);
        if (mode === 'replace') {
          setNotifications([]);
        }
        setErrorKey('errors.generic');
      } finally {
        if (mode === 'replace') {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [requestContext, status]
  );

  const loadFirstPageAndMarkRead = useCallback(async () => {
    if (status !== 'authenticated') {
      setNotifications([]);
      setUnreadCount(0);
      setPage(FIRST_PAGE);
      setTotalPages(FIRST_PAGE);
      setErrorKey(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    try {
      await notificationsRepository.markRead(requestContext);
      emitNotificationsReadEvent();
      const nextData = await notificationsRepository.list(requestContext, { page: FIRST_PAGE });
      setNotifications(nextData.items);
      setUnreadCount(nextData.unreadCount);
      setPage(nextData.page);
      setTotalPages(nextData.totalPages);
    } catch (error) {
      console.warn('Could not refresh notifications inbox', error);
      setNotifications([]);
      setErrorKey('errors.generic');
    } finally {
      setIsLoading(false);
    }
  }, [requestContext, status]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPageAndMarkRead();
    }, [loadFirstPageAndMarkRead])
  );

  const handleNotificationPress = useCallback(async (notification: DTOAccountNotification) => {
    const linkPath = notification.link_path;

    if (linkPath === null || linkPath === '') {
      return;
    }

    const normalized = linkPath.trim();
    if (normalized.length === 0) {
      return;
    }

    try {
      const prefixedLink = normalized.startsWith('http://') || normalized.startsWith('https://');
      if (prefixedLink || normalized.includes('://')) {
        await Linking.openURL(normalized);
        return;
      }

      const scheme = getMobileConfig().deepLinkSchemes[0] ?? 'podverse-next';
      const inAppPath = normalized.startsWith('/') ? normalized.slice(1) : normalized;
      await Linking.openURL(`${scheme}://${inAppPath}`);
    } catch (error) {
      console.warn('Could not navigate from notification link', normalized, error);
    }
  }, []);

  const relativeTimeFormatter = useMemo(() => {
    return new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
  }, [i18n.language]);

  const formatRelativeTime = useCallback(
    (isoDate: string): string => {
      const parts = getRelativeTimeParts(isoDate);
      return parts === null ? '' : relativeTimeFormatter.format(parts.value, parts.unit);
    },
    [relativeTimeFormatter]
  );

  const canLoadMore = page < totalPages;
  const clampedUnreadCount = Math.min(unreadCount, notifications.length);
  const unreadItems = notifications.slice(0, clampedUnreadCount);
  const earlierItems = notifications.slice(clampedUnreadCount);

  const sectionHeader = (
    <>
      <Text style={styles.heading}>{t('settings.notifications.notifications')}</Text>
      <Text style={styles.recentActivityNote}>{t('notifications_page.recent_activity_note')}</Text>
      {unreadItems.length > 0 ? (
        <Text style={styles.sectionHeading}>{t('notifications.section.unread')}</Text>
      ) : null}
    </>
  );

  const sectionedRows = [...unreadItems, ...earlierItems];
  const earlierSectionStartIndex = unreadItems.length;

  return (
    <View style={styles.container} testID="notifications-inbox-screen">
      <FlatList
        ListEmptyComponent={
          isLoading ? (
            <ListLoading testID="notifications-inbox-loading" />
          ) : status !== 'authenticated' ? (
            <ListEmpty
              messageKey="authentication.login_required"
              testID="notifications-inbox-auth-required"
            />
          ) : errorKey !== null ? (
            <RetryableError
              errorKey={errorKey}
              onRetry={() => {
                void loadFirstPageAndMarkRead();
              }}
              testID="notifications-inbox-error"
            />
          ) : (
            <ListEmpty messageKey="notifications_page.empty" testID="notifications-inbox-empty" />
          )
        }
        ListFooterComponent={
          canLoadMore && errorKey === null ? (
            <View style={styles.listFooter}>
              <Pressable
                onPress={() => {
                  if (!isLoadingMore) {
                    void loadPage(page + 1, 'append');
                  }
                }}
                style={styles.loadMoreButton}
                testID="notifications-inbox-load-more"
              >
                <Text style={styles.loadMoreLabel}>
                  {isLoadingMore ? t('misc.loading') : t('info.show_more')}
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        ListHeaderComponent={sectionHeader}
        contentContainerStyle={styles.content}
        data={sectionedRows}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => {
          const isEarlierBoundary = index === earlierSectionStartIndex && earlierItems.length > 0;
          const categoryLabelKey =
            CATEGORY_LABEL_KEYS[item.category as NotificationCategoryEnum] ??
            'settings.notifications.category_general';

          return (
            <>
              {isEarlierBoundary ? (
                <Text style={styles.sectionHeading}>{t('notifications.section.earlier')}</Text>
              ) : null}
              <View style={styles.rowCard}>
                <Card>
                  <Pressable
                    onPress={() => {
                      void handleNotificationPress(item);
                    }}
                    testID={`notifications-inbox-row-${item.id}`}
                  >
                    <Text style={styles.title}>{item.title}</Text>
                    {item.body !== null && item.body !== '' ? (
                      <Text style={styles.body}>{item.body}</Text>
                    ) : null}
                    <Text style={styles.category}>{t(categoryLabelKey)}</Text>
                    <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
                  </Pressable>
                </Card>
              </View>
            </>
          );
        }}
      />
    </View>
  );
}
