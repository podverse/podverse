import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ActionSheetSection } from '../../components/primitives';
import { ActionSheet, Button } from '../../components/primitives';
import type { HomeViewMode } from '../../prefs/homeListPrefs';

type HomeOverflowMenuProps = {
  /** Disabled when no subscription has anything unseen, so the menu never offers a no-op. */
  canMarkAllSeen: boolean;
  onMarkAllSeen: () => void;
  onViewModeChange: (viewMode: HomeViewMode) => void;
  viewMode: HomeViewMode;
};

/**
 * The Home header menu: which way the subscribed list is drawn, and catching up on all of it.
 *
 * The view is offered as two rows with the active one checked, rather than as a single row whose
 * label flips between "Grid View" and "List View". A flipping label cannot say whether it names the
 * mode you are in or the one you would move to, and there is no way to hear the difference — the
 * checked row states it outright, to everyone.
 */
export function HomeOverflowMenu({
  canMarkAllSeen,
  onMarkAllSeen,
  onViewModeChange,
  viewMode,
}: HomeOverflowMenuProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const sections: ActionSheetSection[] = [
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
    {
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
    },
  ];

  return (
    <>
      <Button
        label={t('media.more_options')}
        onPress={() => {
          setIsOpen(true);
        }}
        size="sm"
        testID="home-overflow-trigger"
        variant="secondary"
      />
      <ActionSheet
        onRequestClose={() => {
          setIsOpen(false);
        }}
        sections={sections}
        testID="home-overflow-sheet"
        visible={isOpen}
      />
    </>
  );
}
