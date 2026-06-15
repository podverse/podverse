'use client';

import { useTranslations } from 'next-intl';
import { FaVideo, FaVolumeHigh } from 'react-icons/fa6';

import type { LabeledItemEnclosure } from '@podverse/helpers';
import { getSelectedLabeledItemEnclosureAndSource } from '@podverse/helpers';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useMediaPlayerControls } from '../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../contexts/MediaPlayerCurrentTime';
import { formatEmbedEnclosureSourceDisplay } from '../../lib/embed/formatEmbedEnclosureSourceDisplay';
import { buildEmbedEnclosureSelectionParams } from '../../lib/embed/setEmbedEnclosureSelection';
import { resolveResumeAtSecondsForEnclosureSwitch } from '../../lib/playback/resolveResumeAtSecondsForEnclosureSwitch';
import { buildEnclosureSwitchPlaybackDecisionIfChanged } from '../../lib/playback/stageEnclosureSwitchFromSelection';
import { useEnclosureLabel } from '../../utils/itemEnclosure';

import styles from '../../styles/components/embed/EmbedAlternateEnclosureModal.module.scss';

type EmbedAlternateEnclosureModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type EmbedAlternateEnclosureOptionProps = {
  labeledItemEnclosure: LabeledItemEnclosure;
  isSelected: boolean;
  onSelect: () => void;
};

function EmbedAlternateEnclosureOption({
  labeledItemEnclosure,
  isSelected,
  onSelect,
}: EmbedAlternateEnclosureOptionProps) {
  const tMediaPlayer = useTranslations('media_player');
  const enclosureLabel = useEnclosureLabel(labeledItemEnclosure);
  const title = labeledItemEnclosure.enclosure.title;
  const sourceUri = labeledItemEnclosure.enclosure.item_enclosure_sources?.[0]?.uri;
  const sourceDisplay = formatEmbedEnclosureSourceDisplay(sourceUri);
  const isVideo = labeledItemEnclosure.mediaType === 'video';
  const mediaTypeLabel = isVideo ? tMediaPlayer('source.video') : tMediaPlayer('source.audio');

  return (
    <button
      aria-current={isSelected ? 'true' : undefined}
      className={isSelected ? `${styles.option} ${styles.optionSelected}` : styles.option}
      data-testid={`embed-alternate-enclosure-option-${labeledItemEnclosure.enclosure.type.replace('/', '-')}`}
      onClick={onSelect}
      type="button"
    >
      <span
        aria-label={mediaTypeLabel}
        className={styles.optionMediaIcon}
        data-testid={`embed-alternate-enclosure-option-media-${labeledItemEnclosure.mediaType}`}
      >
        {isVideo ? <FaVideo aria-hidden /> : <FaVolumeHigh aria-hidden />}
      </span>
      <span className={styles.optionContent}>
        {title !== null && title !== undefined && title !== '' ? (
          <span className={styles.optionTitle}>{title}</span>
        ) : null}
        <div className={styles.optionMetaRow}>
          <span className={styles.optionLabel}>{enclosureLabel}</span>
          {sourceDisplay !== null ? (
            <span className={styles.optionSource} title={sourceUri ?? undefined}>
              {sourceDisplay}
            </span>
          ) : null}
        </div>
      </span>
    </button>
  );
}

export function EmbedAlternateEnclosureModal({
  isOpen,
  onClose,
}: EmbedAlternateEnclosureModalProps) {
  const tMediaPlayer = useTranslations('media_player');
  const tMisc = useTranslations('misc');
  const {
    mpClip,
    mpEnclosureSelectedParams,
    mpItemChapter,
    mpItemLabeledItemEnclosures,
    mpItemSoundbite,
    setMPEnclosureSelectedParams,
    setPendingPlaybackDecision,
  } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const { readCurrentTimeSeconds } = useMediaPlayerControls();

  if (!isOpen || mpItemLabeledItemEnclosures.length <= 1) {
    return null;
  }

  const selectedItemEnclosureAndSource = getSelectedLabeledItemEnclosureAndSource({
    labeledItemEnclosures: mpItemLabeledItemEnclosures,
    type: mpEnclosureSelectedParams.type,
    enclosureRowIndex: mpEnclosureSelectedParams.enclosureRowSelected,
    sourceRowIndex: mpEnclosureSelectedParams.sourceRowSelected,
  });

  const selectedEnclosureId = selectedItemEnclosureAndSource.labeledItemEnclosure?.enclosure.id;

  const handleSelect = (labeledItemEnclosure: LabeledItemEnclosure) => {
    if (labeledItemEnclosure.enclosure.id === selectedEnclosureId) {
      onClose();
      return;
    }

    const nextEnclosureSelectedParams = buildEmbedEnclosureSelectionParams(
      mpItemLabeledItemEnclosures,
      labeledItemEnclosure
    );
    const enclosureSwitchDecision = buildEnclosureSwitchPlaybackDecisionIfChanged({
      labeledItemEnclosures: mpItemLabeledItemEnclosures,
      currentEnclosureSelectedParams: mpEnclosureSelectedParams,
      nextEnclosureSelectedParams,
      resumeAtSeconds: resolveResumeAtSecondsForEnclosureSwitch(
        readCurrentTimeSeconds(),
        mpCurrentTime
      ),
      mpClip,
      mpItemSoundbite,
      mpItemChapter,
    });
    if (enclosureSwitchDecision !== null) {
      setPendingPlaybackDecision(enclosureSwitchDecision);
    }
    setMPEnclosureSelectedParams(nextEnclosureSelectedParams);
    onClose();
  };

  return (
    <div
      className={styles.overlay}
      data-testid="embed-alternate-enclosure-modal"
      role="dialog"
      aria-label={tMediaPlayer('source.select_source')}
      aria-modal="true"
    >
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>{tMediaPlayer('source.select_source')}</h2>
          <button
            className={styles.closeButton}
            aria-label={tMisc('close_modal')}
            data-testid="embed-alternate-enclosure-modal-close"
            onClick={onClose}
            type="button"
          >
            {tMisc('close')}
          </button>
        </div>
        <div className={styles.options} data-testid="embed-alternate-enclosure-options">
          {mpItemLabeledItemEnclosures.map((labeledItemEnclosure) => (
            <EmbedAlternateEnclosureOption
              key={`${labeledItemEnclosure.enclosure.type}-${labeledItemEnclosure.enclosure.title ?? labeledItemEnclosure.enclosure.id}`}
              isSelected={labeledItemEnclosure.enclosure.id === selectedEnclosureId}
              labeledItemEnclosure={labeledItemEnclosure}
              onSelect={() => {
                handleSelect(labeledItemEnclosure);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
