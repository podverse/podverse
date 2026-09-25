import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  EnclosureSelectedParams,
  LabeledItemEnclosure,
} from '@podverse/helpers/item/itemEnclosure';

import type { MoreMenuSection } from '../primitives/MoreMenu';
import { MoreMenu } from '../primitives/MoreMenu';
import { EnclosureSourcePickerSheet } from './EnclosureSourcePickerSheet';

type FullPlayerMoreSheetProps = {
  canToggleSubscription: boolean;
  itemLabeledEnclosures: LabeledItemEnclosure[];
  enclosureSelectedParams: EnclosureSelectedParams;
  isMarkedPlayed: boolean;
  isMarkingPlayed: boolean;
  isSubscribed: boolean;
  onCancel: () => void;
  onSelectEnclosureParams: (params: EnclosureSelectedParams) => Promise<void>;
  onTogglePlayed: () => void;
  onToggleSubscription: () => void;
  visible: boolean;
};

export function FullPlayerMoreSheet({
  canToggleSubscription,
  itemLabeledEnclosures,
  enclosureSelectedParams,
  isMarkedPlayed,
  isMarkingPlayed,
  isSubscribed,
  onCancel,
  onSelectEnclosureParams,
  onTogglePlayed,
  onToggleSubscription,
  visible,
}: FullPlayerMoreSheetProps) {
  const { t } = useTranslation();
  const [isSourcePickerVisible, setIsSourcePickerVisible] = useState(false);
  const hasSourcePicker = itemLabeledEnclosures.length > 1;

  useEffect(() => {
    if (!hasSourcePicker) {
      setIsSourcePickerVisible(false);
    }
  }, [hasSourcePicker]);

  const sections = useMemo<MoreMenuSection[]>(
    () => [
      {
        items: [
          ...(hasSourcePicker
            ? [
                {
                  key: 'source',
                  label: t('media_player.source.source'),
                  onPress: () => {
                    setIsSourcePickerVisible(true);
                  },
                  testID: 'full-player-more-source',
                },
              ]
            : []),
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
            disabled: isMarkingPlayed,
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
    [
      canToggleSubscription,
      hasSourcePicker,
      isMarkedPlayed,
      isMarkingPlayed,
      isSubscribed,
      onTogglePlayed,
      onToggleSubscription,
      t,
    ]
  );

  return (
    <>
      <MoreMenu
        cancelLabel={t('misc.cancel')}
        onCancel={onCancel}
        sections={sections}
        testID="full-player-more-sheet"
        visible={visible}
      />
      <EnclosureSourcePickerSheet
        labeledItemEnclosures={itemLabeledEnclosures}
        onCancel={() => {
          setIsSourcePickerVisible(false);
        }}
        onSelectParams={(params) => {
          void onSelectEnclosureParams(params);
        }}
        selectedParams={enclosureSelectedParams}
        testID="full-player-source-picker"
        visible={hasSourcePicker && isSourcePickerVisible}
      />
    </>
  );
}
