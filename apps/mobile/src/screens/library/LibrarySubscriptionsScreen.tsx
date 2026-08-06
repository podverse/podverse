import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { Card, ListRow } from '../../components/primitives';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
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
  const { tokens } = useTheme();
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
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
        },
        // flexBasis + maxWidth (no parent gap) so N columns fit without wrapping early.
        gridCell: {
          flexBasis: `${100 / columns}%`,
          maxWidth: `${100 / columns}%`,
          paddingRight: tokens.spacing.sm,
        },
        rowSpacing: {
          marginTop: tokens.spacing.sm,
        },
      }),
    [columns, tokens]
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

  return (
    <MobileScreenContainer
      heading={t('subscriptions.subscriptions')}
      testID="library-subscriptions-screen"
    >
      {status === 'authenticated' ? (
        <SubscriptionFilterControl
          onChange={handleSubscriptionFilterChange}
          selectedFilter={subscriptionFilter}
          testID="library-subscriptions-filter"
        />
      ) : null}
      <AuthAwareLoadState
        emptyTestID={
          status !== 'authenticated'
            ? 'library-subscriptions-auth-required'
            : 'library-subscriptions-empty'
        }
        errorKey={errorKey}
        errorTestID="library-subscriptions-error"
        isLoading={isLoading}
        loadingTestID="library-subscriptions-loading"
        onRetry={() => {
          void loadSubscriptions();
        }}
        showAuthRequired={status !== 'authenticated'}
        showEmpty={status === 'authenticated' && subscriptions.length === 0}
      >
        <View style={columns > 1 ? styles.grid : undefined}>
          {subscriptions.map((channel) => (
            <View
              key={`${channel.source}-${channel.idText}`}
              style={[styles.rowSpacing, columns > 1 ? styles.gridCell : undefined]}
            >
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
          ))}
        </View>
      </AuthAwareLoadState>
    </MobileScreenContainer>
  );
}
