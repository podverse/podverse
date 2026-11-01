'use client';

import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import type { DTOQueueResource } from '@podverse/helpers';
import { CallToActionMessage } from '@podverse/ui';

import { useModals } from '../../../contexts/Modals';
import { checkBackNavFlag } from '../../../contexts/Navigation';
import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { scrollMainToTop } from '../../../utils/scroll';
import { NoResults } from '../../NoResults/NoResults';
import { Pagination } from '../../Pagination/Pagination';
import { ListQueueResourceRow } from './ListQueueResourceRow';

import styles from '../../../styles/components/List/Queues/ListQueueResources.module.scss';

type Props = {
  isLoading: boolean;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  queueResources: DTOQueueResource[];
  showLoginMessage: boolean;
};

export const ListHistoryResources: React.FC<Props> = ({
  isLoading,
  queueResources,
  showLoginMessage,
  page,
  setPage,
  totalPages,
}) => {
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const tHistory = useTranslations('features.history');
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
  }, [queueResources]);

  const showCallToAction = showLoginMessage;
  const showEmptyMessage = !showLoginMessage && !isLoading && queueResources.length === 0;
  const showHistoryList = !showLoginMessage && queueResources.length > 0;

  return (
    <>
      {showCallToAction && (
        <CallToActionMessage
          message={tInstructions('login_for_history')}
          buttonLabel={tAuthentication('login')}
          onButtonClick={() => setModalAuthLogin({ isOpen: true })}
        />
      )}
      {showEmptyMessage && <NoResults message={tHistory('empty')} role="status" />}
      {showHistoryList && (
        <div className={styles.listWrapper}>
          <Pagination currentPage={page} totalPages={totalPages} setPage={setPage}>
            <div className={styles.list}>
              {queueResources.map((queueResource) => (
                <ListQueueResourceRow
                  key={queueResource.id}
                  queueResource={queueResource}
                  isEditModeQueue={false}
                />
              ))}
            </div>
          </Pagination>
        </div>
      )}
    </>
  );
};
