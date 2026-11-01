import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { MoreMenuSection } from '../../components/primitives';
import { MoreMenu } from '../../components/primitives';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import type { HomeViewMode } from '../../prefs/homeListPrefs';

type RecommendationsOverflowMenuProps = {
  /** Signed-in Taste Profile settings. Omitted when signed out. */
  onEdit?: () => void;
  onViewModeChange: (viewMode: HomeViewMode) => void;
  viewMode: HomeViewMode;
};

/**
 * Recommendations title-bar overflow. List and grid set the view for the current chip (podcasts,
 * albums, artists). Edit follows them when the listener is signed in and opens Taste Profile
 * settings.
 */
export function RecommendationsOverflowMenu({
  onEdit,
  onViewModeChange,
  viewMode,
}: RecommendationsOverflowMenuProps) {
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
          testID: 'recommendations-overflow-view-list',
        },
        {
          key: 'grid',
          label: t('layouts.grid_view'),
          onPress: () => {
            onViewModeChange('grid');
          },
          selected: viewMode === 'grid',
          testID: 'recommendations-overflow-view-grid',
        },
        ...(onEdit !== undefined
          ? [
              {
                key: 'edit',
                label: t('misc.edit'),
                onPress: onEdit,
                testID: 'recommendations-edit',
              },
            ]
          : []),
      ],
      key: 'view',
    },
  ];

  return (
    <View>
      <HeaderBarAction
        accessibilityLabel={t('layouts.change_layout_view')}
        icon="ellipsis-horizontal"
        onPress={() => {
          setIsOpen(true);
        }}
        testID="recommendations-overflow-trigger"
      />
      <MoreMenu
        cancelLabel={t('misc.cancel')}
        onCancel={() => {
          setIsOpen(false);
        }}
        sections={sections}
        testID="recommendations-overflow-menu"
        visible={isOpen}
      />
    </View>
  );
}
