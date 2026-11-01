'use client';

import React from 'react';

import type { CategoryMappingKeys, DTOChannel, DTOItem, DTOItemSoundbite } from '@podverse/helpers';
import type { QueryParamsItemsType } from '@podverse/helpers-requests';

import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { scrollMainToTop } from '../../../utils/scroll';
import { NoResults } from '../../NoResults/NoResults';
import { Pagination } from '../../Pagination/Pagination';
import { ListItemSoundbiteRow } from './ListItemSoundbiteRow';

type Props = {
  page: number;
  setPage: (page: number) => void;
  channel: DTOChannel;
  item: DTOItem | null;
  itemSoundbites: DTOItemSoundbite[];
  totalPages: number;
  showSubscribeMessage?: boolean;
  type?: QueryParamsItemsType;
  category?: CategoryMappingKeys | null;
  showItemInfo?: boolean;
  /** Shown in the shared empty banner once the list has settled with no rows. */
  emptyMessage?: string;
  isLoading?: boolean;
};

export const ListItemSoundbites: React.FC<Props> = ({
  page,
  setPage,
  channel,
  item,
  itemSoundbites,
  totalPages,
  showSubscribeMessage,
  showItemInfo,
  emptyMessage,
  isLoading = false,
}) => {
  useSkipInitialEffect(() => {
    scrollMainToTop();
  }, [itemSoundbites]);

  const showPagination = !showSubscribeMessage;
  const showEmpty =
    emptyMessage !== undefined &&
    !isLoading &&
    !showSubscribeMessage &&
    page <= 1 &&
    itemSoundbites.length === 0;

  if (showEmpty) {
    return <NoResults message={emptyMessage} role="status" />;
  }

  return (
    <>
      {showPagination && (
        <Pagination currentPage={page} totalPages={totalPages} setPage={setPage}>
          {itemSoundbites.map((item_soundbite) => (
            <ListItemSoundbiteRow
              key={item_soundbite.id}
              channel={channel}
              item={item}
              item_soundbite={item_soundbite}
              showItemInfo={showItemInfo}
              playlist_id_text={null}
            />
          ))}
        </Pagination>
      )}
    </>
  );
};
