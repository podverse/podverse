'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { TranscriptRow } from '@podverse/helpers';
import { SearchInput, VirtualizedList } from '@podverse/ui';

import { useMediaPlayerControls } from '../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../contexts/MediaPlayerCurrentTime';
import { ItemTranscriptRow } from './ItemTranscriptRow';

import styles from '../../styles/components/ItemTranscript/ItemTranscript.module.scss';

interface ItemTranscriptProps {
  rows: TranscriptRow[];
  autoScrollOn?: boolean;
}

export const ItemTranscript = ({ rows, autoScrollOn }: ItemTranscriptProps) => {
  const tInfo = useTranslations('info');
  const { seek } = useMediaPlayerControls();
  const { mpCurrentTime, setMPCurrentTime } = useMediaPlayerCurrentTime();

  const [searchTerm, setSearchTerm] = useState<string>('');

  // Ensure rows is always an array
  const safeRows = rows ?? [];

  const handleRowClick = (startTime: number) => {
    seek(startTime);
    setMPCurrentTime(startTime);
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) {
      return safeRows;
    }
    const lowerSearch = searchTerm.toLowerCase();
    return safeRows.filter((row) => row.body?.toLowerCase().includes(lowerSearch));
  }, [safeRows, searchTerm]);

  const highlightedIndex = filteredRows.findIndex(
    (row) =>
      typeof row.startTime === 'number' &&
      typeof row.endTime === 'number' &&
      mpCurrentTime >= row.startTime &&
      mpCurrentTime < row.endTime
  );

  return (
    <div className={styles.transcriptWrapper}>
      <div className={styles.transcriptSearch}>
        <SearchInput
          onSearch={(value) => setSearchTerm(value)}
          placeholder={tInfo('transcript.search_transcript')}
        />
      </div>
      <VirtualizedList
        items={filteredRows}
        height={400}
        highlightedIndex={highlightedIndex}
        autoScrollOn={!!autoScrollOn}
        renderItem={(row, idx) => (
          <ItemTranscriptRow
            key={row.line ?? idx}
            row={row}
            highlight={
              typeof row.startTime === 'number' &&
              typeof row.endTime === 'number' &&
              mpCurrentTime >= row.startTime &&
              mpCurrentTime < row.endTime
            }
            onClick={() => handleRowClick(row.startTime)}
          />
        )}
      />
    </div>
  );
};
