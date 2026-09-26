import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { MoreMenuSection } from '../../components/primitives';
import { MoreMenu } from '../../components/primitives';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import type { HomeViewMode } from '../../prefs/homeListPrefs';

type HomeOverflowMenuProps = {
  /** Disabled when no subscription has anything unseen, so the menu never offers a no-op. */
  canMarkAllSeen: boolean;
  onMarkAllSeen: () => void;
  onViewModeChange: (viewMode: HomeViewMode) => void;
  /**
   * Mark all as seen only applies to the Podcasts subscription list. Keep the trigger visible on
   * every Home chip; omit this section when the current chip is not Podcasts.
   */
  showMarkAllSeen: boolean;
  viewMode: HomeViewMode;
};

/**
 * Home title-bar overflow: list/grid (Home-wide) and optional Mark all as seen.
 *
 * Lives in `headerRight` via {@link HeaderBarAction}. The view is two checked rows rather than a
 * flipping label so the menu states which mode is in effect for every eligible media chip.
 */
export function HomeOverflowMenu({
  canMarkAllSeen,
  onMarkAllSeen,
  onViewModeChange,
  showMarkAllSeen,
  viewMode,
}: HomeOverflowMenuProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const sections: MoreMenuSection[] = [
    {
      items: [
        {
          key: 'list',
          label: t('layouts.list_view'),
          onPress: () => {
            onViewModeChange('list');
          },
          selected: viewMode === 'list',
          testID: 'home-overflow-view-list',
        },
        {
          key: 'grid',
          label: t('layouts.grid_view'),
          onPress: () => {
            onViewModeChange('grid');
          },
          selected: viewMode === 'grid',
          testID: 'home-overflow-view-grid',
        },
      ],
      key: 'view',
      title: t('layouts.change_layout_view'),
    },
  ];

  if (showMarkAllSeen) {
    sections.push({
      items: [
        {
          disabled: !canMarkAllSeen,
          key: 'mark-all-seen',
          label: t('subscriptions.mark_all_seen'),
          onPress: onMarkAllSeen,
          testID: 'home-overflow-mark-all-seen',
        },
      ],
      key: 'actions',
    });
  }

  return (
    <View>
      <HeaderBarAction
        accessibilityLabel={t('layouts.change_layout_view')}
        icon="ellipsis-horizontal"
        onPress={() => {
          setIsOpen(true);
        }}
        testID="home-overflow-trigger"
      />
      <MoreMenu
        cancelLabel={t('misc.cancel')}
        onCancel={() => {
          setIsOpen(false);
        }}
        sections={sections}
        testID="home-overflow-menu"
        visible={isOpen}
      />
    </View>
  );
}
