import React, { useMemo } from 'react';

import { CoreLivestreams } from '../../../components/Core/Livestream/CoreLivestreams';
import { HowToStartInfo } from '../../../components/HowToStartInfo/HowToStartInfo';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { useAccount } from '../../../contexts/Account';
import { useUpcomingAddByRSSLivestreams } from '../../../hooks/useUpcomingAddByRSSLivestreams';
import { mergeSubscribedLivestreamEntries } from '../../../utils/subscribed/mergeSubscribedLivestreams';
import { useLivestreamsPageContext } from './LivestreamsPageContext';

export const LivestreamsPageList: React.FC = () => {
  const { filterParams, setFilterParams, items, totalPages, isLoading, scope } =
    useLivestreamsPageContext();
  const { loggedInAccount } = useAccount();
  const addByRSS = useUpcomingAddByRSSLivestreams(scope === 'subscribed' && !!loggedInAccount);
  const awaitingAddByRSS =
    scope === 'subscribed' && !!loggedInAccount && !addByRSS.isReady && filterParams.page === 1;
  const entries = useMemo(
    () =>
      addByRSS.items.length === 0
        ? undefined
        : mergeSubscribedLivestreamEntries({
            serverItems: items,
            addByRSSItems: addByRSS.items,
            page: filterParams.page,
          }),
    [addByRSS.items, filterParams.page, items]
  );

  return (
    <>
      {scope === 'subscribed' && !loggedInAccount && (
        <HowToStartInfo rows={entries ?? items} totalPages={totalPages} />
      )}
      {awaitingAddByRSS ? null : (
        <CoreLivestreams
          page={filterParams.page}
          setPage={(page) => setFilterParams({ page })}
          items={items}
          totalPages={totalPages}
          showSubscribeMessage={scope === 'subscribed' && !loggedInAccount}
          viewSelected="rows"
          showChannelInfo
          showLiveItemStatus
          entries={entries}
        />
      )}
      <WebLoadingSpinnerOverlay isLoading={isLoading || awaitingAddByRSS} />
    </>
  );
};
