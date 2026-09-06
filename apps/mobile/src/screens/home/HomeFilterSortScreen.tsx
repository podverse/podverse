import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { OptionListItem } from '../../components/form/OptionListGroup';
import { OptionListGroup } from '../../components/form/OptionListGroup';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import type { HomeStackParamList } from '../../navigation';
import type { HomeSortOption } from '../../prefs/homeListPrefs';
import {
  DEFAULT_HOME_SORT,
  HOME_SORT_OPTIONS,
  readHomeListPrefs,
  writeHomeSort,
} from '../../prefs/homeListPrefs';
import { useTheme } from '../../theme/useTheme';

type HomeFilterSortScreenProps = NativeStackScreenProps<HomeStackParamList, 'HomeFilterSort'>;

const SORT_LABEL_KEYS: Record<HomeSortOption, string> = {
  alphabetical: 'filters.sort.a_z',
  recent: 'filters.sort.recent',
};

/**
 * Home's sort choices, as a screen rather than a row of controls.
 *
 * Selections take effect as they are made — Home reads the same stored preference and re-reads it
 * when it changes, so there is nothing to apply. Done therefore only dismisses, which is why it is
 * the sole header action and why there is no cancel: nothing here is pending.
 */
export function HomeFilterSortScreen({ navigation, route }: HomeFilterSortScreenProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const { mediaType } = route.params;
  const [sort, setSort] = useState<HomeSortOption>(DEFAULT_HOME_SORT);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const stored = await readHomeListPrefs(mediaType);
      if (!isMounted) {
        return;
      }
      setSort(stored.sort);
    })();

    return () => {
      isMounted = false;
    };
  }, [mediaType]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: {
          marginBottom: tokens.spacing.lg,
        },
      }),
    [tokens]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderBarAction
          accessibilityLabel={t('misc.done')}
          label={t('misc.done')}
          onPress={() => {
            navigation.goBack();
          }}
          testID="home-filter-sort-done"
        />
      ),
    });
  }, [navigation, t]);

  const handleSortSelect = useCallback(
    (nextSort: HomeSortOption) => {
      setSort(nextSort);
      void writeHomeSort(mediaType, nextSort);
    },
    [mediaType]
  );

  const sortOptions = useMemo<OptionListItem<HomeSortOption>[]>(() => {
    return HOME_SORT_OPTIONS.map((option) => ({
      label: t(SORT_LABEL_KEYS[option]),
      testID: `home-filter-sort-sort-${option}`,
      value: option,
    }));
  }, [t]);

  return (
    <MobileScreenContainer testID="home-filter-sort-screen">
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
