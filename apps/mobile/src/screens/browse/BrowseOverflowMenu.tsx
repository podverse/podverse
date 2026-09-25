import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { MoreMenuSection } from '../../components/primitives';
import { MoreMenu } from '../../components/primitives';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import type { HomeViewMode } from '../../prefs/homeListPrefs';

type BrowseOverflowMenuProps = {
  onViewModeChange: (viewMode: HomeViewMode) => void;
  viewMode: HomeViewMode;
};

/**
 * Browse title-bar overflow for list vs grid. Layout is Browse-wide and only drawn on media chips
 * where artwork identifies the row (podcasts, artists, albums).
 */
export function BrowseOverflowMenu({ onViewModeChange, viewMode }: BrowseOverflowMenuProps) {
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
          testID: 'browse-overflow-view-list',
        },
        {
          key: 'grid',
          label: t('layouts.grid_view'),
          onPress: () => {
            onViewModeChange('grid');
          },
          selected: viewMode === 'grid',
          testID: 'browse-overflow-view-grid',
        },
      ],
      key: 'view',
      title: t('layouts.change_layout_view'),
    },
  ];

  return (
    <View>
      <HeaderBarAction
        accessibilityLabel={t('media.more_options')}
        icon="ellipsis-horizontal"
        onPress={() => {
          setIsOpen(true);
        }}
        testID="browse-overflow-trigger"
      />
      <MoreMenu
        cancelLabel={t('misc.cancel')}
        onCancel={() => {
          setIsOpen(false);
        }}
        sections={sections}
        testID="browse-overflow-menu"
        visible={isOpen}
      />
    </View>
  );
}
