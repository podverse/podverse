import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { Card, ListRow } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListLoading } from '../../components/state/ListLoading';
import { RetryableError } from '../../components/state/RetryableError';
import { SubscriptionFilterControl } from '../../components/subscriptions/SubscriptionFilterControl';
import type { SubscribedChannel } from '../../data/repositories';
import { subscriptionsRepository } from '../../data/repositories';
import type { LibraryStackParamList, MobileTabParamList } from '../../navigation';
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
  const { status } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscribedChannel[]>([]);
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionListFilter>(
    DEFAULT_SUBSCRIPTION_FILTER
  );
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
      if (!isMounted || storedFilter === null) {
        return;
      }
      setSubscriptionFilter(storedFilter);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadSubscriptions = useCallback(async () => {
    if (status !== 'authenticated') {
      setSubscriptions([]);
      setErrorKey(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    try {
      const rows = await subscriptionsRepository.list({ filter: subscriptionFilter });
      setSubscriptions(rows);
    } catch {
      setErrorKey('errors.generic');
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [status, subscriptionFilter]);

  useEffect(() => {
    void loadSubscriptions();
  }, [loadSubscriptions]);

  const handleSubscriptionFilterChange = useCallback((filter: SubscriptionListFilter) => {
    setSubscriptionFilter(filter);
    void writeLibrarySubscriptionFilter(filter);
  }, []);

  const handleRowPress = useCallback(
    (channel: SubscribedChannel) => {
      // Add-by-RSS feeds have no directory channel id; route to the RSS tab (its initial
      // AddByRssRoot screen). Directory follows open the standard Podcast detail.
      if (channel.source === 'addByRss') {
        navigation.getParent<BottomTabNavigationProp<MobileTabParamList>>()?.navigate('RSS');
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
            void loadSubscriptions();
          }}
          testID="library-subscriptions-error"
        />
      );
    }
    if (status !== 'authenticated') {
      return (
        <ListEmpty
          messageKey="authentication.login_required"
          testID="library-subscriptions-auth-required"
        />
      );
    }
    if (subscriptions.length === 0) {
      return <ListEmpty messageKey="misc.info" testID="library-subscriptions-empty" />;
    }
    return null;
  }, [errorKey, isLoading, loadSubscriptions, status, subscriptions.length]);

  const renderHeader = (
    <>
      <Text style={styles.heading}>{t('subscriptions.subscriptions')}</Text>
      {status === 'authenticated' ? (
        <SubscriptionFilterControl
          onChange={handleSubscriptionFilterChange}
          selectedFilter={subscriptionFilter}
          testID="library-subscriptions-filter"
        />
      ) : null}
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
                subtitle={channel.source === 'addByRss' ? t('subscriptions.filter.add_by_rss') : undefined}
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
