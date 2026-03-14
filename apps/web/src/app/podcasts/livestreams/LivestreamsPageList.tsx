import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOCategory } from '@podverse/helpers';

import { CoreLivestreams } from '../../../components/Core/Livestream/CoreLivestreams';
import { HowToStartInfo } from '../../../components/InfoWrapper/HowToStartInfo';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { ModalCategoriesSelect } from '../../../components/Modal/ModalCategoriesSelect';
import { ButtonTabs } from '../../../components/Tabs/ButtonTabs';
import { ROUTES } from '../../../constants/routes';
import { useAccount } from '../../../contexts/Account';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import { onClickCategory } from '../../../utils/categories';
import { useLivestreamsPageContext } from './LivestreamsPageContext';

import styles from '../../../styles/app/podcasts/livestreams/LivestreamsList.module.scss';

type LivestreamsPageListProps = {
  medium: 'av' | 'music';
};

export const LivestreamsPageList: React.FC<LivestreamsPageListProps> = ({ medium }) => {
  const {
    filterParams,
    setFilterParams,
    items,
    totalPages,
    isLoading,
    showSubscribeMessage,
    showCategoriesModal,
    setShowCategoriesModal,
  } = useLivestreamsPageContext();
  const { viewSelected } = useLocalSettings();
  const { page } = filterParams;
  const router = useRouter();
  const tMedia = useTranslations('media');
  const { loggedInAccount } = useAccount();

  const handleOnClickCategory = (category: DTOCategory) => {
    const route = medium === 'av' ? ROUTES.PODCASTS_LIVESTREAMS : ROUTES.MUSIC_LIVESTREAMS;
    onClickCategory({
      category,
      setFilterParams,
      filterParams,
      setShowCategoriesModal,
      linkPath: route,
      router,
    });
  };

  const buttonTabs = [
    {
      key: 'live',
      label: tMedia('livestream.live'),
      onClick: () => setFilterParams({ ...filterParams, page: 1, liveItemType: 'live' }),
    },
    {
      key: 'pending',
      label: tMedia('livestream.pending'),
      onClick: () => setFilterParams({ ...filterParams, page: 1, liveItemType: 'pending' }),
    },
    {
      key: 'ended',
      label: tMedia('livestream.ended'),
      onClick: () => setFilterParams({ ...filterParams, page: 1, liveItemType: 'ended' }),
    },
  ];

  return (
    <>
      {filterParams.type === 'subscribed' && !loggedInAccount && (
        <HowToStartInfo rows={items} totalPages={totalPages} />
      )}
      <ButtonTabs buttonTabs={buttonTabs} selectedKey={filterParams.liveItemType} />
      <div className={styles.listWrapper}>
        <CoreLivestreams
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          items={items}
          totalPages={totalPages}
          showSubscribeMessage={showSubscribeMessage}
          viewSelected={viewSelected}
          showChannelInfo
        />
      </div>
      <LoadingSpinnerOverlay isLoading={isLoading} />
      <ModalCategoriesSelect
        isOpen={showCategoriesModal}
        onCategoryClick={handleOnClickCategory}
        setIsOpen={setShowCategoriesModal}
      />
    </>
  );
};
