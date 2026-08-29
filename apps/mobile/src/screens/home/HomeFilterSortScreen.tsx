import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OptionListItem } from '../../components/form/OptionListGroup';
import { OptionListGroup } from '../../components/form/OptionListGroup';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import type { HomeStackParamList } from '../../navigation';
import type { HomeSortOption } from '../../prefs/homeListPrefs';
import {
  DEFAULT_HOME_SORT,
  HOME_SORT_OPTIONS,
  isHomeSubscriptionFilterMediaType,
  readHomeListPrefs,
  writeHomeSort,
  writeHomeSubscriptionFilter,
} from '../../prefs/homeListPrefs';
import type { SubscriptionListFilter } from '../../prefs/subscriptionFilter';
import { DEFAULT_SUBSCRIPTION_FILTER } from '../../prefs/subscriptionFilter';
import { useTheme } from '../../theme/useTheme';

type HomeFilterSortScreenProps = NativeStackScreenProps<HomeStackParamList, 'HomeFilterSort'>;

const SORT_LABEL_KEYS: Record<HomeSortOption, string> = {
  alphabetical: 'filters.sort.a_z',
  recent: 'filters.sort.recent',
};

const FILTER_OPTION_KEYS: { filter: SubscriptionListFilter; labelKey: string }[] = [
  { filter: 'all', labelKey: 'subscriptions.filter.all' },
  { filter: 'addByRss', labelKey: 'subscriptions.filter.add_by_rss' },
];

/**
 * Home's filter and sort choices, as a screen rather than a row of controls.
 *
 * Selections take effect as they are made — Home reads the same stored preference and re-reads it
 * when it changes, so there is nothing to apply. Done therefore only dismisses, which is why it is
 * the sole header action and why there is no cancel: nothing here is pending.
 */
export function HomeFilterSortScreen({ navigation, route }: HomeFilterSortScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const { mediaType } = route.params;
  const showFilterSection = isHomeSubscriptionFilterMediaType(mediaType);

  const [sort, setSort] = useState<HomeSortOption>(DEFAULT_HOME_SORT);
  const [filter, setFilter] = useState<SubscriptionListFilter>(DEFAULT_SUBSCRIPTION_FILTER);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const stored = await readHomeListPrefs(mediaType);
      if (!isMounted) {
        return;
      }
      setSort(stored.sort);
      setFilter(stored.filter);
    })();

    return () => {
      isMounted = false;
    };
  }, [mediaType]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        done: {
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.xs,
        },
        doneLabel: {
          color: themeStyles.buttonPrimary.backgroundColor,
          fontSize: 16,
          fontWeight: '700',
        },
        section: {
          marginBottom: tokens.spacing.lg,
        },
      }),
    [themeStyles, tokens]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            navigation.goBack();
          }}
          style={styles.done}
          testID="home-filter-sort-done"
        >
          <Text style={styles.doneLabel}>{t('misc.done')}</Text>
        </Pressable>
      ),
    });
  }, [navigation, styles, t]);

  const handleSortSelect = useCallback(
    (nextSort: HomeSortOption) => {
      setSort(nextSort);
      void writeHomeSort(mediaType, nextSort);
    },
    [mediaType]
  );

  const handleFilterSelect = useCallback((nextFilter: SubscriptionListFilter) => {
    setFilter(nextFilter);
    void writeHomeSubscriptionFilter(nextFilter);
  }, []);

  const sortOptions = useMemo<OptionListItem<HomeSortOption>[]>(() => {
    return HOME_SORT_OPTIONS.map((option) => ({
      label: t(SORT_LABEL_KEYS[option]),
      testID: `home-filter-sort-sort-${option}`,
      value: option,
    }));
  }, [t]);

  const filterOptions = useMemo<OptionListItem<SubscriptionListFilter>[]>(() => {
    return FILTER_OPTION_KEYS.map((option) => ({
      label: t(option.labelKey),
      testID: `home-filter-sort-filter-${option.filter}`,
      value: option.filter,
    }));
  }, [t]);

  return (
    <MobileScreenContainer testID="home-filter-sort-screen">
      {showFilterSection ? (
        <View style={styles.section}>
          <OptionListGroup
            heading={t('filters.screen.filter_heading')}
            onSelect={handleFilterSelect}
            options={filterOptions}
            testID="home-filter-sort-filter-group"
            value={filter}
          />
        </View>
      ) : null}
      <View style={styles.section}>
        <OptionListGroup
          heading={t('filters.screen.sort_heading')}
          onSelect={handleSortSelect}
          options={sortOptions}
          testID="home-filter-sort-sort-group"
          value={sort}
        />
      </View>
    </MobileScreenContainer>
  );
}
