'use client';

import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import type { CategoryMappingKeys, ChannelUnseenBadge, DTOChannel } from '@podverse/helpers';
import type { QueryParamsSubscribedType } from '@podverse/helpers-requests';
import { CallToActionMessage } from '@podverse/ui';

import { useModals } from '../../../contexts/Modals';
import { checkBackNavFlag } from '../../../contexts/Navigation';
import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { scrollMainToTop } from '../../../utils/scroll';
import { Pagination } from '../../Pagination/Pagination';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import { CorePodcastNodes } from './CorePodcastNodes';

import styles from '../../../styles/components/Common/List/Podcasts/ListPodcasts.module.scss';

type Props = {
  page: number;
  setPage: (page: number) => void;
  channels: DTOChannel[];
  totalPages: number;
  showSubscribeMessage: boolean;
  type: QueryParamsSubscribedType;
  category: CategoryMappingKeys | null;
  viewSelected: ViewSelectedOption;
  /** Keyed by channel id_text. Empty unless this is the subscribed list for a signed-in account. */
  unseenBadges?: ReadonlyMap<string, ChannelUnseenBadge>;
};

export const CorePodcasts: React.FC<Props> = ({
  page,
  setPage,
  channels,
  totalPages,
  showSubscribeMessage,
  unseenBadges,
  viewSelected,
}) => {
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const { setModalAuthLogin } = useModals();

  // Skip scroll on the first effect run when returning via back navigation.
  // Check synchronously during render to capture the flag before it's cleared
  const skipScrollOnceRef = useRef(checkBackNavFlag());

  useSkipInitialEffect(() => {
    // Skip scroll-to-top once if this is a back navigation
    if (skipScrollOnceRef.current) {
      skipScrollOnceRef.current = false;
      return;
    }
    scrollMainToTop();
  }, [channels]);

  const showCallToAction = showSubscribeMessage;
  const showPagination = !showSubscribeMessage;

  const listNodes = CorePodcastNodes({ channels, unseenBadges, viewSelected });

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
          {listNodes}
        </Pagination>
      )}
    </>
  );
};
