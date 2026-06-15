'use client';

import type { EmbedListRow } from '../../lib/embed/embedListTypes';
import { isEmbedItemCurrentlyLive } from '../../lib/embed/resolveEmbedLiveItemStatus';
import { PlayButtonRow } from '../MediaPlayer/Buttons/PlayButtonRow';
import { ReadableDate } from '../Time/ReadableDate';
import { ReadableDuration } from '../Time/ReadableDuration';
import { ReadableTimeRange } from '../Time/ReadableTimeRange';
import { EmbedLiveItemStatus } from './EmbedLiveItemStatus';

import styles from '../../styles/components/embed/EmbedListRow.module.scss';

type EmbedListRowProps = {
  row: EmbedListRow;
  isActive: boolean;
  isLastRow?: boolean;
  onSelect: () => void;
};

function EmbedListRowMeta({ row }: { row: EmbedListRow }) {
  const publishDate = row.item.pub_date;
  const hasPublishDate = publishDate !== null && publishDate !== undefined && publishDate !== '';

  if (row.itemChapter !== null && row.itemChapter !== undefined) {
    return (
      <>
        {hasPublishDate ? <ReadableDate date={publishDate} /> : null}
        {hasPublishDate ? ' • ' : null}
        <ReadableTimeRange startTime={String(row.itemChapter.start_time)} endTime={null} />
      </>
    );
  }

  if (row.clip !== null && row.clip !== undefined) {
    return (
      <>
        {hasPublishDate ? <ReadableDate date={publishDate} /> : null}
        {hasPublishDate ? ' • ' : null}
        <ReadableTimeRange startTime={String(row.clip.start_time)} endTime={row.clip.end_time} />
      </>
    );
  }

  const durationRaw = row.item.item_about?.duration;
  const durationStr =
    durationRaw !== null && durationRaw !== undefined && Number(durationRaw) > 0
      ? durationRaw
      : null;

  return (
    <>
      {hasPublishDate ? <ReadableDate date={publishDate} /> : null}
      {hasPublishDate && durationStr !== null ? ' • ' : null}
      <ReadableDuration durationStr={durationStr} positionStr={null} />
    </>
  );
}

export function EmbedListRow({ row, isActive, isLastRow = false, onSelect }: EmbedListRowProps) {
  const isCurrentlyLive = isEmbedItemCurrentlyLive(row.item);

  const rowClassName = [isActive ? styles.rowActive : styles.row, isLastRow ? styles.rowLast : null]
    .filter((className): className is string => className !== null)
    .join(' ');

  return (
    <div
      className={rowClassName}
      data-testid={isActive ? 'embed-list-row-active' : 'embed-list-row'}
    >
      <div className={styles.playButtonCell}>
        <PlayButtonRow
          clip={row.clip ?? undefined}
          item={row.item}
          item_chapter={row.itemChapter ?? undefined}
          item_soundbite={row.itemSoundbite ?? undefined}
          onClick={onSelect}
        />
      </div>
      <button className={styles.contentButton} onClick={onSelect} type="button">
        <span className={styles.titleRow}>
          {isCurrentlyLive ? <EmbedLiveItemStatus /> : null}
          <span className={styles.title}>{row.listLabel}</span>
        </span>
        <span className={styles.meta} data-testid="embed-list-row-meta">
          <EmbedListRowMeta row={row} />
        </span>
      </button>
    </div>
  );
}
