'use client';

import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import type { DTOItem } from '@podverse/helpers';
import { CallToActionMessage } from '@podverse/ui';

import { useModals } from '../../../contexts/Modals';
import { checkBackNavFlag } from '../../../contexts/Navigation';
import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { scrollMainToTop } from '../../../utils/scroll';
import type { SubscribedLivestreamEntry } from '../../../utils/subscribed/mergeSubscribedLivestreams';
import { NoResults } from '../../NoResults/NoResults';
import { Pagination } from '../../Pagination/Pagination';
import { SubscribedLivestreamNodes } from '../../Subscribed/SubscribedLivestreamNodes';
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
  showLiveItemStatus?: boolean;
  entries?: readonly SubscribedLivestreamEntry[];
};

export const CoreLivestreams: React.FC<Props> = ({
  page,
  setPage,
  items,
  totalPages,
  showSubscribeMessage,
  viewSelected,
  showChannelInfo,
  showLiveItemStatus,
  entries,
}) => {
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const tMedia = useTranslations('media');
  const { setModalAuthLogin } = useModals();
  const listed = entries ?? items;

  // Skip scroll on the first effect run when returning via back navigation.
  const skipScrollOnceRef = useRef(checkBackNavFlag());

  useSkipInitialEffect(() => {
    // Skip scroll-to-top once if this is a back navigation
    if (skipScrollOnceRef.current) {
      skipScrollOnceRef.current = false;
      return;
    }
    scrollMainToTop();
  }, [listed]);

  const showCallToAction = showSubscribeMessage;
  const showPagination = !showSubscribeMessage;

  const showNoContentFound = page <= 1 && listed.length === 0;

  // A signed-out subscribed list explains itself with the login message. An empty
  // directory or signed-in list says there are no livestreams.
  if (showNoContentFound && !showSubscribeMessage) {
    return <NoResults message={tMedia('livestream.no_livestreams_found')} role="status" />;
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
          {entries !== undefined ? (
            <SubscribedLivestreamNodes entries={entries} showChannelInfo={showChannelInfo} />
          ) : (
            <CoreLivestreamNodes
              items={items}
              viewSelected={viewSelected}
              showChannelInfo={showChannelInfo}
              showLiveItemStatus={showLiveItemStatus}
            />
          )}
        </Pagination>
      )}
    </>
  );
};
