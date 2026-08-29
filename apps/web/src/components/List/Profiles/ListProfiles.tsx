'use client';

import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import type { DTOAccount } from '@podverse/helpers';
import type { QueryParamsSubscribedType } from '@podverse/helpers-requests';
import { CallToActionMessage } from '@podverse/ui';

import { useModals } from '../../../contexts/Modals';
import { checkBackNavFlag } from '../../../contexts/Navigation';
import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { scrollMainToTop } from '../../../utils/scroll';
import { Pagination } from '../../Pagination/Pagination';
import { ListProfileNodes } from './ListProfileNodes';

import styles from '../../../styles/components/List/Profiles/ListProfiles.module.scss';

type Props = {
  page: number;
  setPage: (page: number) => void;
  accounts: DTOAccount[];
  totalPages: number;
  showSubscribeMessage: boolean;
  type: QueryParamsSubscribedType | null;
};

export const ListProfiles: React.FC<Props> = ({
  page,
  setPage,
  accounts,
  totalPages,
  showSubscribeMessage,
}) => {
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
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
  }, [accounts]);

  const showCallToAction = showSubscribeMessage;
  const showPagination = !showSubscribeMessage;

  const listNodes = ListProfileNodes({ accounts });

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
