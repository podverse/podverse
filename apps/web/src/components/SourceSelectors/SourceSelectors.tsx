import { useTranslations } from 'next-intl';
import { Fragment } from 'react';

import type { LabeledItemEnclosure } from '@podverse/helpers';
import { getDownloadFilenameFromSource } from '@podverse/helpers';
import { Divider } from '@podverse/ui';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useMediaPlayerControls } from '../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../contexts/MediaPlayerCurrentTime';
import { useModals } from '../../contexts/Modals';
import { resolveResumeAtSecondsForEnclosureSwitch } from '../../lib/playback/resolveResumeAtSecondsForEnclosureSwitch';
import { buildEnclosureSwitchPlaybackDecisionIfChanged } from '../../lib/playback/stageEnclosureSwitchFromSelection';
import { downloadAndSaveFile } from '../../utils/fileDownloader';
import { showToast, showToastPromiseWithLoading } from '../Toast/Toast';
import { SourceSelectorRow } from './SourceSelectorRow';

import styles from '../../styles/components/SourceSelectors/SourceSelectors.module.scss';

export type SourceSelectorActionType =
  | 'load-in-player'
  | 'download-episode'
  | 'download-track'
  | null;

type SourceSelectorsProps = {
  labeledItemEnclosures: LabeledItemEnclosure[];
  actionType: SourceSelectorActionType;
  itemTitle: string | null;
};

export const SourceSelectors = ({
  labeledItemEnclosures,
  actionType,
  itemTitle,
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

  const onClick = (enclosureIndex: number, sourceIndex: number) => {
    const labeledItemEnclosure = labeledItemEnclosures[enclosureIndex];
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
      } else if (actionType === 'download-episode') {
        if (!source.uri) {
          showToast(tFeatures('download.episode_download_error'), 'error');
          return;
        }
        const filename = getDownloadFilenameFromSource({
          itemTitle,
          sourceUri: source.uri,
          fallbackFilename: 'episode.mp3',
        });

        showToastPromiseWithLoading(downloadAndSaveFile(source.uri, filename), {
          loading: tFeatures('download.downloading_episode'),
          success: tFeatures('download.episode_downloaded'),
          error: tFeatures('download.episode_download_error'),
        });
      } else if (actionType === 'download-track') {
        if (!source.uri) {
          showToast(tFeatures('download.track_download_error'), 'error');
          return;
        }
        const filename = getDownloadFilenameFromSource({
          itemTitle,
          sourceUri: source.uri,
          fallbackFilename: 'track.mp3',
        });

        showToastPromiseWithLoading(downloadAndSaveFile(source.uri, filename), {
          loading: tFeatures('download.downloading_track'),
          success: tFeatures('download.track_downloaded'),
          error: tFeatures('download.track_download_error'),
        });
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
      {labeledItemEnclosures.map((labeledItemEnclosure, idx) => (
        <Fragment key={idx}>
          <SourceSelectorRow
            labeledItemEnclosure={labeledItemEnclosure}
            labeledItemEnclosureIndex={idx}
            onClick={onClick}
          />
          {idx < labeledItemEnclosures.length - 1 && <Divider className={styles.divider} />}
        </Fragment>
      ))}
    </div>
  );
};
