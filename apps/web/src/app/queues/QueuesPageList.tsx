'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import LoadingSpinnerOverlay from '../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { useQueuesPageContext } from './QueuesPageContext';

const ListQueueResources = dynamic(
  () =>
    import('../../components/List/Queues/ListQueueResources').then((m) => ({
      default: m.ListQueueResources,
    })),
  {
    ssr: false,
  }
);

export const QueuesPageList: React.FC = () => {
  const { filterParams, queueResources, isLoading, showLoginMessage } = useQueuesPageContext();
  const { medium } = filterParams;

  return (
    <>
      <ListQueueResources
        queueMedium={medium}
        queueResources={queueResources}
        showLoginMessage={showLoginMessage}
      />
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
