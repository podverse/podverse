'use client';

import { useCallback, useMemo, useState } from 'react';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useEmbedPlaybackLoad } from '../../hooks/useEmbedPlaybackLoad';
import type {
  EmbedListData,
  EmbedListRow as EmbedListRowType,
} from '../../lib/embed/embedListTypes';
import type { EmbedSharedQueryParams } from '../../lib/embed/embedTypes';
import {
  flattenEmbedListRows,
  resolveEmbedListDefaultRow,
} from '../../lib/embed/resolveEmbedListDefaultRow';
import { EmbedFooter } from './EmbedFooter';
import { EmbedListRow } from './EmbedListRow';
import { EmbedPlayerPanel } from './EmbedPlayerPanel';

import groupStyles from '../../styles/components/embed/EmbedListRow.module.scss';
import styles from '../../styles/components/embed/EmbedListShell.module.scss';

type EmbedListShellProps = {
  listData: EmbedListData;
  sharedQuery: EmbedSharedQueryParams;
  playIdText: string | null;
};

export function EmbedListShell({ listData, sharedQuery, playIdText }: EmbedListShellProps) {
  const allRows = useMemo(() => flattenEmbedListRows(listData.groups), [listData.groups]);
  const initialRow = useMemo(
    () => resolveEmbedListDefaultRow(allRows, playIdText),
    [allRows, playIdText]
  );

  const [selectedRow, setSelectedRow] = useState<EmbedListRowType | null>(initialRow);
  const [playbackStartSeconds, setPlaybackStartSeconds] = useState(sharedQuery.startSeconds);
  const [shouldPlay, setShouldPlay] = useState(sharedQuery.autoplay);
  const { mpIsPlaying, setMPIsPlaying } = useMediaPlayer();

  useEmbedPlaybackLoad({
    resource: selectedRow,
    shouldPlay,
    startSeconds: playbackStartSeconds,
    enabled: selectedRow !== null && selectedRow.mediaType === 'audio',
  });

  const handleRowSelect = useCallback(
    (row: EmbedListRowType) => {
      if (selectedRow?.rowKey === row.rowKey) {
        setMPIsPlaying(!mpIsPlaying);
        setShouldPlay(!mpIsPlaying);
        return;
      }

      setSelectedRow(row);
      setPlaybackStartSeconds(0);
      setShouldPlay(true);
    },
    [mpIsPlaying, selectedRow?.rowKey, setMPIsPlaying]
  );

  const selectedResource = selectedRow
    ? {
        channel: selectedRow.channel,
        item: selectedRow.item,
        clip: selectedRow.clip,
        itemChapter: selectedRow.itemChapter,
        itemSoundbite: selectedRow.itemSoundbite,
      }
    : null;

  return (
    <section className={styles.shell} data-testid="embed-list-shell">
      <EmbedPlayerPanel
        fallbackResource={selectedResource}
        headerTitle={listData.headerTitle}
        mediaType={selectedRow?.mediaType ?? 'audio'}
      />
      <div className={styles.listRegion} data-testid="embed-list-region">
        {listData.groups.map((group) => (
          <div key={group.groupKey}>
            {group.title ? <p className={groupStyles.groupTitle}>{group.title}</p> : null}
            {group.rows.map((row) => (
              <EmbedListRow
                key={row.rowKey}
                isActive={selectedRow?.rowKey === row.rowKey}
                onSelect={() => handleRowSelect(row)}
                row={row}
              />
            ))}
          </div>
        ))}
      </div>
      <EmbedFooter />
    </section>
  );
}
