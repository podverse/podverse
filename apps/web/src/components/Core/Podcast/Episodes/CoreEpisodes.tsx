'use client';

import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';

import { useModals } from '../../../../contexts/Modals';
import { checkBackNavFlag } from '../../../../contexts/Navigation';
import { useSkipInitialEffect } from '../../../../hooks/useSkipInitialEffect';
import { scrollMainToTop } from '../../../../utils/scroll';
import { CallToActionMessage } from '../../../CallToActionMessage/CallToActionMessage';
import Pagination from '../../../Pagination/Pagination';
import type { ViewSelectedOption } from '../../../ViewSelector/ViewSelector';
import { CoreEpisodeNodes } from './CoreEpisodeNodes';

import styles from '../../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodes.module.scss';

type Props = {
  page: number;
  setPage: (page: number) => void;
  channel: DTOChannel | null;
  items: DTOItem[];
  totalPages: number;
  showSubscribeMessage?: boolean;
  viewSelected: ViewSelectedOption;
  showChannelInfo?: boolean;
};

export const CoreEpisodes: React.FC<Props> = ({
  page,
  setPage,
  channel,
  items,
  totalPages,
  showSubscribeMessage,
  viewSelected,
  showChannelInfo,
}) => {
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const { setModalAuthLogin } = useModals();

  // Track if we should skip scroll on the first effect run (back navigation case)
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
          <CoreEpisodeNodes
            channel={channel}
            items={items}
            viewSelected={viewSelected}
            showChannelInfo={showChannelInfo}
          />
        </Pagination>
      )}
    </>
  );
};
