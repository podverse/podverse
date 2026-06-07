'use client';

import type { EmbedListRow } from '../../lib/embed/embedListTypes';
import { PlayButtonRow } from '../MediaPlayer/Buttons/PlayButtonRow';
import { ReadableDate } from '../Time/ReadableDate';
import { ReadableDuration } from '../Time/ReadableDuration';

import styles from '../../styles/components/embed/EmbedListRow.module.scss';

type EmbedListRowProps = {
  row: EmbedListRow;
  isActive: boolean;
  onSelect: () => void;
};

export function EmbedListRow({ row, isActive, onSelect }: EmbedListRowProps) {
  const durationRaw = row.item.item_about?.duration;
  const durationStr =
    durationRaw !== null &&
    durationRaw !== undefined &&
    Number(durationRaw) > 0
      ? durationRaw
      : null;

  return (
    <div
      className={isActive ? styles.rowActive : styles.row}
      data-testid={isActive ? 'embed-list-row-active' : 'embed-list-row'}
    >
      <PlayButtonRow
        clip={row.clip ?? undefined}
        item={row.item}
        item_chapter={row.itemChapter ?? undefined}
        item_soundbite={row.itemSoundbite ?? undefined}
        onClick={onSelect}
      />
      <button className={styles.contentButton} onClick={onSelect} type="button">
        <span className={styles.title}>{row.listLabel}</span>
        <span className={styles.meta} data-testid="embed-list-row-meta">
          <ReadableDate date={row.item.pub_date} />
          {durationStr !== null ? ' • ' : null}
          <ReadableDuration durationStr={durationStr} positionStr={null} />
        </span>
      </button>
    </div>
  );
}
