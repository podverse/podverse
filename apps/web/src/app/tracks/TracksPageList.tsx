import React from 'react';

import { CoreTracks } from '../../components/Core/Artist/Album/Track/CoreTracks';
import { HowToStartInfo } from '../../components/InfoWrapper/HowToStartInfo';
import LoadingSpinnerOverlay from '../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { useTracksPageContext } from './TracksPageContext';

export const TracksPageList: React.FC = () => {
  const { filterParams, setFilterParams, items, totalPages, isLoading, showSubscribeMessage } =
    useTracksPageContext();
  const { viewSelected } = useLocalSettings();
  const { page, type } = filterParams;

  return (
    <>
      {type === 'subscribed' && <HowToStartInfo rows={items} totalPages={totalPages} />}
      <CoreTracks
        page={page}
        setPage={(page) => setFilterParams({ ...filterParams, page })}
        channel={null}
        items={items}
        totalPages={totalPages}
        showSubscribeMessage={showSubscribeMessage}
        viewSelected={viewSelected}
        showChannelInfo
      />
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
