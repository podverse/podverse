'use client';

import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import type { DTOItem } from '@podverse/helpers';
import { CallToActionMessage, InfoWrapper } from '@podverse/ui';

import { useModals } from '../../../contexts/Modals';
import { checkBackNavFlag } from '../../../contexts/Navigation';
import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { scrollMainToTop } from '../../../utils/scroll';
import { Pagination } from '../../Pagination/Pagination';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import { CoreLivestreamNodes } from './CoreLivestreamNodes';

import styles from '../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodes.module.scss';

type Props = {
  page: number;
  setPage: (page: number) => void;
  items: DTOItem[];
  totalPages: number;
  showSubscribeMessage?: boolean;
  viewSelected: ViewSelectedOption;
  showChannelInfo?: boolean;
};

export const CoreLivestreams: React.FC<Props> = ({
  page,
  setPage,
  items,
  totalPages,
  showSubscribeMessage,
  viewSelected,
  showChannelInfo,
}) => {
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const tMedia = useTranslations('media');
  const { setModalAuthLogin } = useModals();

  // Skip scroll on the first effect run when returning via back navigation.
  const skipScrollOnceRef = useRef(checkBackNavFlag());

  useSkipInitialEffect(() => {
    // Skip scroll-to-top once if this is a back navigation
    if (skipScrollOnceRef.current) {
      skipScrollOnceRef.current = false;
      return;
    }
    scrollMainToTop();
  }, [items]);

  const showCallToAction = showSubscribeMessage;
  const showPagination = !showSubscribeMessage;

  const showNoContentFound = page <= 1 && items.length === 0;

  if (showNoContentFound) {
    return (
      <InfoWrapper>
        <p>{tMedia('livestream.no_livestreams_found')}</p>
      </InfoWrapper>
    );
  }

  return (
    <>
      {showCallToAction && (
        <CallToActionMessage
          message={tInstructions('login_for_subscriptions')}
          buttonLabel={tAuthentication('login')}
          onButtonClick={() => setModalAuthLogin({ isOpen: true })}
        />
      )}
      {showPagination && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          setPage={setPage}
          paginationControlsClassName={styles.paginationControls}
        >
          <CoreLivestreamNodes
            items={items}
            viewSelected={viewSelected}
            showChannelInfo={showChannelInfo}
          />
        </Pagination>
      )}
    </>
  );
};
