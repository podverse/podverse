import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { MoreMenuSection } from '../primitives/MoreMenu';
import { MoreMenu } from '../primitives/MoreMenu';

type FullPlayerMoreSheetProps = {
  canToggleSubscription: boolean;
  isMarkedPlayed: boolean;
  isSubscribed: boolean;
  onCancel: () => void;
  onTogglePlayed: () => void;
  onToggleSubscription: () => void;
  visible: boolean;
};

export function FullPlayerMoreSheet({
  canToggleSubscription,
  isMarkedPlayed,
  isSubscribed,
  onCancel,
  onTogglePlayed,
  onToggleSubscription,
  visible,
}: FullPlayerMoreSheetProps) {
  const { t } = useTranslation();

  const sections = useMemo<MoreMenuSection[]>(
    () => [
      {
        items: [
          ...(canToggleSubscription
            ? [
                {
                  key: 'subscription',
                  label: isSubscribed ? t('features.unsubscribe') : t('features.subscribe'),
                  onPress: onToggleSubscription,
                  testID: 'full-player-more-subscription',
                },
              ]
            : []),
          {
            key: 'mark-played',
            label: isMarkedPlayed
              ? t('features.history.mark_as_unplayed')
              : t('features.history.mark_as_played'),
            onPress: onTogglePlayed,
            testID: 'full-player-more-mark-played',
          },
        ],
        key: 'actions',
      },
    ],
    [canToggleSubscription, isMarkedPlayed, isSubscribed, onTogglePlayed, onToggleSubscription, t]
  );

  return (
    <MoreMenu
      cancelLabel={t('misc.cancel')}
      onCancel={onCancel}
      sections={sections}
      testID="full-player-more-sheet"
      visible={visible}
    />
  );
}
