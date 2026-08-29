'use client';

import React, { useRef } from 'react';

import type { DTOChannel, QueryParamsMedium } from '@podverse/helpers';

import { checkBackNavFlag } from '../../../contexts/Navigation';
import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { scrollMainToTop } from '../../../utils/scroll';
import { Pagination } from '../../Pagination/Pagination';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import { CoreCombinedChannelNodes } from './CoreCombinedChannelNodes';

import styles from '../../../styles/components/Common/List/Podcasts/ListPodcasts.module.scss';

type CoreCombinedChannelsProps = {
  page: number;
  setPage: (page: number) => void;
  channels: DTOChannel[];
  totalPages: number;
  filterMedium: QueryParamsMedium;
  viewSelected: ViewSelectedOption;
};

export const CoreCombinedChannels: React.FC<CoreCombinedChannelsProps> = ({
  page,
  setPage,
  channels,
  totalPages,
  filterMedium,
  viewSelected,
}) => {
  // Skip scroll on the first effect run when returning via back navigation.
  const skipScrollOnceRef = useRef(checkBackNavFlag());

  useSkipInitialEffect(() => {
    // Skip scroll-to-top once if this is a back navigation
    if (skipScrollOnceRef.current) {
      skipScrollOnceRef.current = false;
      return;
    }
    scrollMainToTop();
  }, [channels]);

  return (
    <Pagination
      currentPage={page}
      totalPages={totalPages}
      setPage={setPage}
      paginationControlsClassName={styles.paginationControls}
    >
      <CoreCombinedChannelNodes
        channels={channels}
        viewSelected={viewSelected}
        filterMedium={filterMedium}
      />
    </Pagination>
  );
};
