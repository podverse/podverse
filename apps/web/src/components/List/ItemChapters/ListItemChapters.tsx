'use client';

import React from 'react';

import type { DTOChannel, DTOItem, DTOItemChapter } from '@podverse/helpers';

import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { scrollMainToTop } from '../../../utils/scroll';
import { NoResults } from '../../NoResults/NoResults';
import { Pagination } from '../../Pagination/Pagination';
import { ListItemChapterRow } from './ListItemChapterRow';

type ListItemChaptersProps = {
  page: number;
  setPage: (page: number) => void;
  channel: DTOChannel | null;
  item: DTOItem | null;
  item_chapters: DTOItemChapter[];
  totalPages: number;
  onPlayChapter?: (chapter: DTOItemChapter) => void;
  getChapterHref?: (chapter: DTOItemChapter) => string;
  /** Shown in the shared empty banner once the list has settled with no rows. */
  emptyMessage?: string;
  isLoading?: boolean;
};

export const ListItemChapters: React.FC<ListItemChaptersProps> = ({
  page,
  setPage,
  channel,
  item,
  item_chapters,
  totalPages,
  onPlayChapter,
  getChapterHref,
  emptyMessage,
  isLoading = false,
}) => {
  useSkipInitialEffect(() => {
    scrollMainToTop();
  }, [item_chapters]);

  if (emptyMessage !== undefined && !isLoading && page <= 1 && item_chapters.length === 0) {
    return <NoResults message={emptyMessage} role="status" />;
  }

  return (
    <Pagination currentPage={page} totalPages={totalPages} setPage={setPage}>
      {item_chapters.map((item_chapter) => (
        <ListItemChapterRow
          key={item_chapter.id_text ?? item_chapter.id}
          channel={channel}
          item={item}
          item_chapter={item_chapter}
          onPlayChapter={onPlayChapter}
          getChapterHref={getChapterHref}
        />
      ))}
    </Pagination>
  );
};
