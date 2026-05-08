'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
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
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
