'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { TranscriptRow } from '@podverse/helpers';
import {
  filterTranscriptRowsByBody,
  findActiveTranscriptRowIndex,
} from '@podverse/helpers/transcript';
import { Button, SearchInput, VirtualizedList } from '@podverse/ui';

import { useMediaPlayerControls } from '../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../contexts/MediaPlayerCurrentTime';
import { NoResults } from '../NoResults/NoResults';
import { ItemTranscriptRow } from './ItemTranscriptRow';

import styles from '../../styles/components/ItemTranscript/ItemTranscript.module.scss';

const LIST_MIN_HEIGHT_PX = 400;

interface ItemTranscriptProps {
  rows: TranscriptRow[];
}

export const ItemTranscript = ({ rows }: ItemTranscriptProps) => {
  const tInfo = useTranslations('info');
  const tMisc = useTranslations('misc');
  const { seek } = useMediaPlayerControls();
  const { mpCurrentTime, setMPCurrentTime } = useMediaPlayerCurrentTime();
  const listSlotRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(LIST_MIN_HEIGHT_PX);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [autoScrollOn, setAutoScrollOn] = useState(true);

  const safeRows = rows ?? [];

  useEffect(() => {
    const el = listSlotRef.current;
    if (el === null) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) {
        return;
      }
      const nextHeight = Math.max(LIST_MIN_HEIGHT_PX, Math.floor(entry.contentRect.height));
      setListHeight(nextHeight);
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const handleRowClick = (startTime: number) => {
    seek(startTime);
    setMPCurrentTime(startTime);
  };

  const filteredRows = useMemo(
    () => filterTranscriptRowsByBody(safeRows, searchTerm),
    [safeRows, searchTerm]
  );

  const highlightedIndex = findActiveTranscriptRowIndex(filteredRows, mpCurrentTime);
  const showFilterEmpty = searchTerm.trim() !== '' && filteredRows.length === 0;

  return (
    <div className={styles.transcriptWrapper}>
      <div className={styles.transcriptToolbar}>
        <div className={styles.transcriptSearch}>
          <SearchInput
            aria-label={tInfo('transcript.search_transcript')}
            clearButtonAriaLabel={tMisc('clear_search')}
            onSearch={(value) => setSearchTerm(value)}
            placeholder={tInfo('transcript.search_transcript')}
          />
        </div>
        <Button onClick={() => setAutoScrollOn(!autoScrollOn)} variant="mini">
          {autoScrollOn ? tMisc('autoscroll.autoscroll_on') : tMisc('autoscroll.autoscroll_off')}
        </Button>
      </div>
      <div className={styles.transcriptListSlot} ref={listSlotRef}>
        {showFilterEmpty ? (
          <NoResults role="status" />
        ) : (
          <VirtualizedList
            items={filteredRows}
            height={listHeight}
            highlightedIndex={highlightedIndex}
            autoScrollOn={autoScrollOn}
            renderItem={(row, idx) => (
              <ItemTranscriptRow
                key={row.line ?? idx}
                row={row}
                highlight={highlightedIndex === idx}
                onClick={() => handleRowClick(row.startTime)}
              />
            )}
          />
        )}
      </div>
    </div>
  );
};
