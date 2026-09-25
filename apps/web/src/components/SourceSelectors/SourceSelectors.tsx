import { useTranslations } from 'next-intl';
import { Fragment } from 'react';

import type { EnclosureSelectedParams, LabeledItemEnclosure } from '@podverse/helpers';
import { labeledItemEnclosuresForDirectDownload } from '@podverse/helpers';
import { Divider } from '@podverse/ui';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useMediaPlayerControls } from '../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../contexts/MediaPlayerCurrentTime';
import { useModals } from '../../contexts/Modals';
import {
  buildEnclosureSwitchPlaybackDecisionIfChanged,
  resolveResumeAtSecondsForEnclosureSwitch,
} from '../../lib/playback';
import { startProgressiveDownload } from '../../utils/downloadModal/startProgressiveDownload';
import { downloadAndSaveFile } from '../../utils/fileDownloader';
import { showToast, showToastPromiseWithLoading } from '../Toast/Toast';
import { SourceSelectorRow } from './SourceSelectorRow';

import styles from '../../styles/components/SourceSelectors/SourceSelectors.module.scss';

export type SourceSelectorActionType =
  'load-in-player' | 'download-episode' | 'download-track' | null;

type SourceSelectorsProps = {
  labeledItemEnclosures: LabeledItemEnclosure[];
  actionType: SourceSelectorActionType;
  itemTitle: string | null;
  /**
   * When provided (the displayed item is NOT the now-playing item), selecting a
   * source loads that item into the player with the chosen enclosure instead of
   * re-pointing the now-playing item's enclosure. When absent, the now-playing
   * in-place switch (preserving position) is used.
   */
  onLoadInPlayerWithSource?: ((params: EnclosureSelectedParams) => void) | null;
};

export const SourceSelectors = ({
  labeledItemEnclosures,
  actionType,
  itemTitle,
  onLoadInPlayerWithSource,
}: SourceSelectorsProps) => {
  const tFeatures = useTranslations('features');
  const {
    mpClip,
    mpEnclosureSelectedParams,
    mpItemChapter,
    mpItemSoundbite,
    setMPEnclosureSelectedParams,
    setPendingPlaybackDecision,
  } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const { readCurrentTimeSeconds } = useMediaPlayerControls();
  const { setModalSourceSelector } = useModals();
  const isDownloadAction = actionType === 'download-episode' || actionType === 'download-track';
  const rows = isDownloadAction
    ? labeledItemEnclosuresForDirectDownload(labeledItemEnclosures)
    : labeledItemEnclosures;

  const onClick = (enclosureIndex: number, sourceIndex: number) => {
    const labeledItemEnclosure = rows[enclosureIndex];
    if (!labeledItemEnclosure) {
      return;
    }
    const source = labeledItemEnclosure.enclosure.item_enclosure_sources?.[sourceIndex];
    if (source) {
      const mediaType = labeledItemEnclosure.mediaType;
      if (actionType === 'load-in-player') {
        const nextEnclosureSelectedParams = {
          type: mediaType,
          enclosureRowSelected: enclosureIndex,
          sourceRowSelected: sourceIndex,
        };
        if (onLoadInPlayerWithSource) {
          // The displayed item is not the now-playing item: load it with the
          // chosen source (acts as a play button) rather than mutating the
          // loaded item's enclosure.
          onLoadInPlayerWithSource(nextEnclosureSelectedParams);
        } else {
          const enclosureSwitchDecision = buildEnclosureSwitchPlaybackDecisionIfChanged({
            labeledItemEnclosures,
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
        }
      } else if (actionType === 'download-episode' || actionType === 'download-track') {
        const isEpisode = actionType === 'download-episode';
        const errorKey = isEpisode
          ? 'download.episode_download_error'
          : 'download.track_download_error';
        if (!source.uri) {
          showToast(tFeatures(errorKey), 'error');
          return;
        }
        const resolution = startProgressiveDownload({
          uri: source.uri,
          mime: labeledItemEnclosure.enclosure.type,
          itemTitle,
          fallbackFilename: isEpisode ? 'episode.mp3' : 'track.mp3',
          downloadAndSaveFile,
          showToastPromiseWithLoading,
          messages: {
            loading: tFeatures(
              isEpisode ? 'download.downloading_episode' : 'download.downloading_track'
            ),
            success: tFeatures(
              isEpisode ? 'download.episode_downloaded' : 'download.track_downloaded'
            ),
            error: tFeatures(errorKey),
          },
        });
        if (!resolution.ok && resolution.reason !== 'missing_uri') {
          showToast(tFeatures(errorKey), 'error');
        }
      }
    }

    setModalSourceSelector({
      labeledItemEnclosures: [],
      actionType: null,
      itemTitle: null,
    });
  };

  return (
    <div className={styles.sourceSelectors}>
      {rows.map((labeledItemEnclosure, idx) => (
        <Fragment key={idx}>
          <SourceSelectorRow
            labeledItemEnclosure={labeledItemEnclosure}
            labeledItemEnclosureIndex={idx}
            onClick={onClick}
          />
          {idx < rows.length - 1 && <Divider className={styles.divider} />}
        </Fragment>
      ))}
    </div>
  );
};
