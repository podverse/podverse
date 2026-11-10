import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import type { AddByRSSResourceType } from '@podverse/helpers';

import { BrowseEmptyResults } from '../../../components/Browse/BrowseEmptyResults';
import { CoreTracks } from '../../../components/Core/Artist/Album/Track/CoreTracks';
import { HowToStartInfo } from '../../../components/HowToStartInfo/HowToStartInfo';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import { useSubscribedAddByRSSItems } from '../../../hooks/useSubscribedAddByRSSItems';
import {
  shouldShowBrowseByRecentAction,
  shouldShowBrowseEmptyMessage,
} from '../../../utils/mediaListChips';
import { mergeSubscribedItemEntries } from '../../../utils/subscribed/mergeSubscribedItems';
import { useTracksPageContext } from './TracksPageContext';

const NO_TYPES: readonly AddByRSSResourceType[] = [];
const ADD_BY_RSS_TRACK_TYPES = ['artists', 'albums', 'tracks'] as const;

export const TracksPageList: React.FC = () => {
  const {
    filterParams,
    setFilterParams,
    items,
    totalPages,
    isLoading,
    showSubscribeMessage,
    scope,
  } = useTracksPageContext();
  const { viewSelected } = useLocalSettings();
  const tMedia = useTranslations('media');
  const { page, sort: listSort, type } = filterParams;
  // Subscribed Tracks offers Recent and Top. Any other sort stays the server list.
  const sort = listSort === 'recent' || listSort === 'top' ? listSort : null;
  const addByRSS = useSubscribedAddByRSSItems(
    scope === 'subscribed' ? ADD_BY_RSS_TRACK_TYPES : NO_TYPES
  );
  const entries = useMemo(() => {
    if (sort === null || addByRSS.items.length === 0) {
      return undefined;
    }
    return mergeSubscribedItemEntries({
      serverItems: items,
      addByRSSItems: addByRSS.items,
      sort,
      page,
      totalPages,
    });
  }, [addByRSS.items, items, page, sort, totalPages]);
  // Recent page 1 and the last Top page mix in local tracks. Hold those rows until that read settles.
  const awaitingAddByRSS =
    sort !== null &&
    ((sort === 'recent' && page === 1) || (sort === 'top' && page === totalPages)) &&
    !addByRSS.isReady;

  const showEmpty = shouldShowBrowseEmptyMessage({
    isBrowse: scope === 'browse',
    isLoading,
    page,
    rowCount: items.length,
  });
  const showBrowseByRecent = shouldShowBrowseByRecentAction({
    showEmpty,
    sort: filterParams.sort,
  });
  const handleBrowseByRecent = () => {
    setFilterParams({ ...filterParams, page: 1, sort: 'recent', range: null });
  };

  return (
    <>
      {/* Wait until the Add by RSS read settles so a feed-only list does not flash this. */}
      {type === 'subscribed' && addByRSS.isReady && (
        <HowToStartInfo rows={entries ?? items} totalPages={totalPages} />
      )}
      {showEmpty ? (
        <BrowseEmptyResults
          message={tMedia('music.no_tracks_found')}
          onBrowseByRecent={showBrowseByRecent ? handleBrowseByRecent : undefined}
        />
      ) : awaitingAddByRSS ? null : (
        <CoreTracks
          page={page}
          setPage={(nextPage) => setFilterParams({ ...filterParams, page: nextPage })}
          channel={null}
          items={items}
          totalPages={totalPages}
          showSubscribeMessage={showSubscribeMessage}
          viewSelected={viewSelected}
          showChannelInfo
          entries={entries}
        />
      )}
      <WebLoadingSpinnerOverlay isLoading={isLoading || awaitingAddByRSS} />
    </>
  );
};
