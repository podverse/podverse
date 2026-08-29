import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card, ListRow } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListLoading } from '../../components/state/ListLoading';
import { RetryableError } from '../../components/state/RetryableError';
import { SubscriptionFilterControl } from '../../components/subscriptions/SubscriptionFilterControl';
import type { SubscribedChannel } from '../../data/repositories';
import { subscriptionsRepository } from '../../data/repositories';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import {
  DEFAULT_SUBSCRIPTION_FILTER,
  readLibrarySubscriptionFilter,
  type SubscriptionListFilter,
  writeLibrarySubscriptionFilter,
} from '../../prefs/subscriptionFilter';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';

type LibrarySubscriptionsScreenProps = NativeStackScreenProps<
  LibraryStackParamList,
  'LibrarySubscriptions'
>;

export function LibrarySubscriptionsScreen({ navigation }: LibrarySubscriptionsScreenProps) {
  const { t } = useTranslation();
  const { columns } = useResponsive();
  const { styles: themeStyles, tokens } = useTheme();
  const [subscriptions, setSubscriptions] = useState<SubscribedChannel[]>([]);
  /** `null` until the remembered chip is in hand, which is what the first read waits on. */
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionListFilter | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          padding: tokens.spacing.lg,
        },
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '700',
          marginBottom: tokens.spacing.md,
        },
        gridCell: {
          flexBasis: `${100 / columns}%`,
          flex: 1,
          maxWidth: `${100 / columns}%`,
        },
        gridRow: {
          columnGap: tokens.spacing.sm,
        },
        rowSpacing: {
          marginTop: tokens.spacing.sm,
        },
      }),
    [columns, themeStyles, tokens]
  );

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const storedFilter = await readLibrarySubscriptionFilter();
      if (isMounted) {
        setSubscriptionFilter(storedFilter);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // No auth check: subscriptions are device-local, so this list is the same read signed in or
  // out. Gating it on `status` would show "log in" to a signed-out user who has subscriptions.
  const loadSubscriptions = useCallback(async (filter: SubscriptionListFilter) => {
    setIsLoading(true);
    setErrorKey(null);
    try {
      const rows = await subscriptionsRepository.list({ filter });
      setSubscriptions(rows);
    } catch {
      setErrorKey('errors.generic');
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Waits on the remembered chip rather than reading with the default and correcting itself, which
  // would show the wrong list first and read it twice.
  useEffect(() => {
    if (subscriptionFilter === null) {
      return;
    }
    void loadSubscriptions(subscriptionFilter);
  }, [loadSubscriptions, subscriptionFilter]);

  const handleSubscriptionFilterChange = useCallback((filter: SubscriptionListFilter) => {
    setSubscriptionFilter(filter);
    void writeLibrarySubscriptionFilter(filter);
  }, []);

  const handleRowPress = useCallback(
    (channel: SubscribedChannel) => {
      // Add-by-RSS feeds have no directory channel id; route to the in-library Add-by-RSS root.
      // Directory follows open the standard Podcast detail.
      if (channel.source === 'addByRss') {
        navigation.navigate(LIBRARY_STACK_ROUTES.AddByRssRoot);
        return;
      }
      navigation.navigate(LIBRARY_STACK_ROUTES.PodcastDetail, {
        podcastId: channel.idText,
      });
    },
    [navigation]
  );

  const statusOverlay = useMemo(() => {
    if (isLoading) {
      return <ListLoading testID="library-subscriptions-loading" />;
    }
    if (errorKey !== null) {
      return (
        <RetryableError
          errorKey={errorKey}
          onRetry={() => {
            void loadSubscriptions(subscriptionFilter ?? DEFAULT_SUBSCRIPTION_FILTER);
          }}
          testID="library-subscriptions-error"
        />
      );
    }
    if (subscriptions.length === 0) {
      return <ListEmpty messageKey="misc.info" testID="library-subscriptions-empty" />;
    }
    return null;
  }, [errorKey, isLoading, loadSubscriptions, subscriptionFilter, subscriptions.length]);

  const renderHeader = (
    <>
      <Text style={styles.heading}>{t('subscriptions.subscriptions')}</Text>
      <SubscriptionFilterControl
        onChange={handleSubscriptionFilterChange}
        selectedFilter={subscriptionFilter ?? DEFAULT_SUBSCRIPTION_FILTER}
        testID="library-subscriptions-filter"
      />
    </>
  );

  return (
    <View style={styles.container} testID="library-subscriptions-screen">
      <FlatList
        ListEmptyComponent={statusOverlay}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.content}
        data={statusOverlay === null ? subscriptions : []}
        key={`subs-cols-${columns}`}
        keyExtractor={(channel) => `${channel.source}-${channel.idText}`}
        numColumns={columns}
        renderItem={({ item: channel }) => (
          <View style={[styles.rowSpacing, columns > 1 ? styles.gridCell : undefined]}>
            <Card>
              <ListRow
                onPress={() => {
                  handleRowPress(channel);
                }}
                subtitle={
                  channel.source === 'addByRss' ? t('subscriptions.filter.add_by_rss') : undefined
                }
                testID={`library-subscription-row-${channel.idText}`}
                title={channel.title}
              />
            </Card>
          </View>
        )}
      />
    </View>
  );
}
