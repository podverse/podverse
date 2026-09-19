import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  EnclosureSelectedParams,
  LabeledItemEnclosure,
} from '@podverse/helpers/item/itemEnclosure';
import { getSelectedLabeledItemEnclosureAndSource } from '@podverse/helpers/item/itemEnclosure';

import type { MoreMenuSection } from '../primitives';
import { MoreMenu } from '../primitives';

type EnclosureSourcePickerSheetProps = {
  labeledItemEnclosures: LabeledItemEnclosure[];
  onCancel: () => void;
  onSelectParams: (params: EnclosureSelectedParams) => void;
  selectedParams: EnclosureSelectedParams;
  testID: string;
  visible: boolean;
};

const resolveEnclosureTypeIndex = (
  labeledItemEnclosures: LabeledItemEnclosure[],
  enclosureAbsoluteIndex: number
): number => {
  const selected = labeledItemEnclosures[enclosureAbsoluteIndex];
  if (selected === undefined) {
    return 0;
  }
  let typeIndex = 0;
  for (let index = 0; index < enclosureAbsoluteIndex; index += 1) {
    if (labeledItemEnclosures[index]?.mediaType === selected.mediaType) {
      typeIndex += 1;
    }
  }
  return typeIndex;
};

const resolveSelectedEnclosureAbsoluteIndex = (
  labeledItemEnclosures: LabeledItemEnclosure[],
  selectedParams: EnclosureSelectedParams
): number | null => {
  const selected = getSelectedLabeledItemEnclosureAndSource({
    enclosureRowIndex: selectedParams.enclosureRowSelected,
    labeledItemEnclosures,
    sourceRowIndex: selectedParams.sourceRowSelected,
    type: selectedParams.type,
  }).labeledItemEnclosure;
  if (selected === null) {
    return null;
  }
  const index = labeledItemEnclosures.findIndex((entry) => entry === selected);
  return index >= 0 ? index : null;
};

const buildEnclosureLabel = (
  labeledItemEnclosure: LabeledItemEnclosure,
  t: (key: string, values?: Record<string, string | number>) => string
): string => {
  const title = labeledItemEnclosure.enclosure.title?.trim();
  if (title !== undefined && title.length > 0) {
    return title;
  }

  if (labeledItemEnclosure.mediaType === 'video') {
    const resolution = labeledItemEnclosure.videoHeight;
    const ext = labeledItemEnclosure.fileExtension;
    if (resolution !== undefined && ext !== undefined) {
      return t('media_player.source.video_with_ext_resolution', { ext, resolution });
    }
    if (resolution !== undefined) {
      return t('media_player.source.video_with_resolution', { resolution });
    }
    if (ext !== undefined) {
      return t('media_player.source.video_with_ext', { ext });
    }
    return t('media_player.source.video');
  }

  const bitrate = labeledItemEnclosure.audioBitrate;
  const ext = labeledItemEnclosure.fileExtension;
  if (bitrate !== undefined && ext !== undefined) {
    if (bitrate.unit === 'kbps') {
      return t('media_player.source.audio_with_ext_bitrate_kbps', { bitrate: bitrate.value, ext });
    }
    return t('media_player.source.audio_with_ext_bitrate_mbps', { bitrate: bitrate.value, ext });
  }
  if (bitrate !== undefined) {
    if (bitrate.unit === 'kbps') {
      return t('media_player.source.audio_with_bitrate_kbps', { bitrate: bitrate.value });
    }
    return t('media_player.source.audio_with_bitrate_mbps', { bitrate: bitrate.value });
  }
  if (ext !== undefined) {
    return t('media_player.source.audio_with_ext', { ext });
  }
  return t('media_player.source.audio');
};

const buildSourceLabel = (
  labeledItemEnclosure: LabeledItemEnclosure,
  sourceIndex: number,
  t: (key: string, values?: Record<string, string | number>) => string
): string => {
  const source = labeledItemEnclosure.enclosure.item_enclosure_sources[sourceIndex];
  const uri = source?.uri?.trim();
  if (uri === undefined || uri.length === 0) {
    return t('media_player.source.source');
  }
  return uri;
};

export function EnclosureSourcePickerSheet({
  labeledItemEnclosures,
  onCancel,
  onSelectParams,
  selectedParams,
  testID,
  visible,
}: EnclosureSourcePickerSheetProps) {
  const { t } = useTranslation();
  const [pendingEnclosureAbsoluteIndex, setPendingEnclosureAbsoluteIndex] = useState<number | null>(
    null
  );

  const selectedEnclosureAbsoluteIndex = useMemo(
    () => resolveSelectedEnclosureAbsoluteIndex(labeledItemEnclosures, selectedParams),
    [labeledItemEnclosures, selectedParams]
  );
  const selectedSourceIndex = selectedParams.sourceRowSelected ?? 0;

  const closeAll = () => {
    setPendingEnclosureAbsoluteIndex(null);
    onCancel();
  };

  const enclosureSections = useMemo<MoreMenuSection[]>(
    () => [
      {
        items: labeledItemEnclosures.map((entry, enclosureAbsoluteIndex) => {
          const enclosureTypeIndex = resolveEnclosureTypeIndex(
            labeledItemEnclosures,
            enclosureAbsoluteIndex
          );
          const nextParams: EnclosureSelectedParams = {
            enclosureRowSelected: enclosureTypeIndex,
            sourceRowSelected: 0,
            type: entry.mediaType,
          };
          const hasMultipleSources = entry.enclosure.item_enclosure_sources.length > 1;
          return {
            key: `enclosure-${enclosureAbsoluteIndex}`,
            label: buildEnclosureLabel(entry, t),
            onPress: () => {
              if (hasMultipleSources) {
                setPendingEnclosureAbsoluteIndex(enclosureAbsoluteIndex);
                return;
              }
              onSelectParams(nextParams);
              closeAll();
            },
            selected: selectedEnclosureAbsoluteIndex === enclosureAbsoluteIndex,
            testID: `${testID}-enclosure-${enclosureAbsoluteIndex}`,
          };
        }),
        key: 'enclosures',
        title: t('media_player.source.select_source'),
      },
    ],
    [labeledItemEnclosures, onSelectParams, selectedEnclosureAbsoluteIndex, t, testID]
  );

  const sourceSections = useMemo<MoreMenuSection[]>(() => {
    if (pendingEnclosureAbsoluteIndex === null) {
      return [];
    }
    const labeledEnclosure = labeledItemEnclosures[pendingEnclosureAbsoluteIndex];
    if (labeledEnclosure === undefined) {
      return [];
    }

    const enclosureTypeIndex = resolveEnclosureTypeIndex(
      labeledItemEnclosures,
      pendingEnclosureAbsoluteIndex
    );

    return [
      {
        items: labeledEnclosure.enclosure.item_enclosure_sources.map((_, sourceIndex) => ({
          key: `source-${sourceIndex}`,
          label: buildSourceLabel(labeledEnclosure, sourceIndex, t),
          onPress: () => {
            onSelectParams({
              enclosureRowSelected: enclosureTypeIndex,
              sourceRowSelected: sourceIndex,
              type: labeledEnclosure.mediaType,
            });
            closeAll();
          },
          selected:
            selectedEnclosureAbsoluteIndex === pendingEnclosureAbsoluteIndex &&
            selectedSourceIndex === sourceIndex,
          testID: `${testID}-source-${sourceIndex}`,
        })),
        key: 'sources',
        title: buildEnclosureLabel(labeledEnclosure, t),
      },
    ];
  }, [
    labeledItemEnclosures,
    onSelectParams,
    pendingEnclosureAbsoluteIndex,
    selectedEnclosureAbsoluteIndex,
    selectedSourceIndex,
    t,
    testID,
  ]);

  return (
    <>
      <MoreMenu
        cancelLabel={t('misc.cancel')}
        onCancel={closeAll}
        sections={enclosureSections}
        testID={`${testID}-enclosures`}
        visible={visible}
      />
      <MoreMenu
        cancelLabel={t('misc.cancel')}
        onCancel={() => {
          setPendingEnclosureAbsoluteIndex(null);
        }}
        sections={sourceSections}
        testID={`${testID}-sources`}
        visible={pendingEnclosureAbsoluteIndex !== null}
      />
    </>
  );
}
