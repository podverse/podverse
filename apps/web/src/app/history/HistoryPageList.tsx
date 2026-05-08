import React from 'react';

import { ListHistoryResources } from '../../components/List/Queues/ListHistoryResources';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { useHistoryPageContext } from './HistoryPageContext';

export const HistoryPageList: React.FC = () => {
  const { filterParams, setFilterParams, queueResources, isLoading, showLoginMessage, totalPages } =
    useHistoryPageContext();
  const { page } = filterParams;

  return (
    <>
      <ListHistoryResources
        page={page}
        setPage={(page) => setFilterParams({ ...filterParams, page })}
        totalPages={totalPages}
        queueResources={queueResources}
        showLoginMessage={showLoginMessage}
      />
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
