'use client';

import React from 'react';

import type { DTOChannel, DTOItem, DTOItemChapter } from '@podverse/helpers';

import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { scrollMainToTop } from '../../../utils/scroll';
import Pagination from '../../Pagination/Pagination';
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
}) => {
  useSkipInitialEffect(() => {
    scrollMainToTop();
  }, [item_chapters]);

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
