'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useEmbedPlaybackLoad } from '../../hooks/useEmbedPlaybackLoad';
import type {
  EmbedListData,
  EmbedListRow as EmbedListRowType,
} from '../../lib/embed/embedListTypes';
import type { EmbedMediaType, EmbedSharedQueryParams } from '../../lib/embed/embedTypes';
import {
  flattenEmbedListRows,
  resolveEmbedListDefaultRow,
} from '../../lib/embed/resolveEmbedListDefaultRow';
import {
  listHasMixedEmbedMedia,
  resolveInitialPresentationStyle,
} from '../../lib/embed/resolveEmbedListPresentationStyle';
import { EmbedListRow } from './EmbedListRow';
import { EmbedPlayerPanel } from './EmbedPlayerPanel';
import { EmbedPresentationStyleSelector } from './EmbedPresentationStyleSelector';

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
  const hasMixedMedia = useMemo(() => listHasMixedEmbedMedia(allRows), [allRows]);

  const [selectedRow, setSelectedRow] = useState<EmbedListRowType | null>(initialRow);
  const [presentationStyle, setPresentationStyle] = useState<EmbedMediaType>(() =>
    resolveInitialPresentationStyle(initialRow)
  );
  const [playbackStartSeconds, setPlaybackStartSeconds] = useState(sharedQuery.startSeconds);
  const [shouldPlay, setShouldPlay] = useState(sharedQuery.autoplay);
  const { mpIsPlaying, setMPIsPlaying } = useMediaPlayer();

  useEffect(() => {
    if (!hasMixedMedia) {
      setPresentationStyle(resolveInitialPresentationStyle(selectedRow));
    }
  }, [hasMixedMedia, selectedRow]);

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
      setPresentationStyle(resolveInitialPresentationStyle(row));
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

  const shellClassName =
    presentationStyle === 'video' ? `${styles.shell} ${styles.shellVideo}` : styles.shell;

  return (
    <section className={shellClassName} data-testid="embed-list-shell">
      <EmbedPlayerPanel
        fallbackResource={selectedResource}
        headerTitle={listData.headerTitle}
        mediaType={presentationStyle}
        panelLayout="list"
      />
      {hasMixedMedia ? (
        <EmbedPresentationStyleSelector onChange={setPresentationStyle} value={presentationStyle} />
      ) : null}
      <div className={styles.listRegion} data-testid="embed-list-region">
        {listData.groups.map((group) => (
          <div key={group.groupKey}>
            {group.title ? <div className={groupStyles.groupTitle}>{group.title}</div> : null}
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
    </section>
  );
}
