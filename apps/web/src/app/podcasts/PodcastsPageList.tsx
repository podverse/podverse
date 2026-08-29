import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import type { DTOCategory } from '@podverse/helpers';
import { PAGINATION } from '@podverse/helpers';
import { InfoWrapper } from '@podverse/ui';

import { CorePodcasts } from '../../components/Core/Podcast/CorePodcasts';
import { HowToStartInfo } from '../../components/HowToStartInfo/HowToStartInfo';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { ModalCategoriesSelect } from '../../components/Modal/ModalCategoriesSelect';
import { ROUTES } from '../../constants/routes';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { useChannelUnseenBadges } from '../../hooks/useChannelUnseenBadges';
import { useFullSubscribedChannels } from '../../hooks/useFullSubscribedChannels';
import { onClickCategory } from '../../utils/categories';
import { selectFilteredSubscribedPage } from './podcastsFilter';
import { usePodcastsPageContext } from './PodcastsPageContext';

import styles from '../../styles/components/Common/List/Podcasts/ListPodcastsFilter.module.scss';

export const PodcastsPageList: React.FC = () => {
  const {
    filterParams,
    setFilterParams,
    filterTerm,
    channels,
    totalPages,
    isLoading,
    showSubscribeMessage,
    showCategoriesModal,
    setShowCategoriesModal,
  } = usePodcastsPageContext();
  const { viewSelected } = useLocalSettings();
  const { medium, page, range, sort, type, category } = filterParams;
  const router = useRouter();
  const tSubscriptions = useTranslations('subscriptions');
  // Only the subscribed list: unseen is measured against what the account follows, so it says
  // nothing about a category or top-charts list the user is browsing.
  const unseenBadges = useChannelUnseenBadges(type === 'subscribed');

  const isSubscribed = type === 'subscribed';
  const trimmedTerm = filterTerm.trim();
  const isFiltering = isSubscribed && trimmedTerm !== '';

  const fullList = useFullSubscribedChannels(isFiltering, { medium, range, sort });

  // Filtered pages are counted separately from server pages, so paging through matches never asks
  // the server for a page the filtered list does not correspond to, and clearing a term puts the
  // user back on the server page they left.
  const [filteredPage, setFilteredPage] = useState<number>(1);
  useEffect(() => {
    setFilteredPage(1);
  }, [range, sort, trimmedTerm]);

  // Memoized because the list below treats a new `channels` array as a new list and scrolls to the
  // top when it sees one. Rebuilding the slice on every render would scroll the page out from under
  // anyone typing.
  const filtered = useMemo(
    () =>
      selectFilteredSubscribedPage({
        channels: fullList.channels,
        page: filteredPage,
        pageSize: PAGINATION.DEFAULT_LIMIT,
        term: trimmedTerm,
      }),
    [filteredPage, fullList.channels, trimmedTerm]
  );

  const showNoFilterMatches = isFiltering && fullList.isReady && filtered.matchCount === 0;

  const handleOnClickCategory = (category: DTOCategory) => {
    onClickCategory({
      category,
      setFilterParams,
      filterParams,
      setShowCategoriesModal,
      linkPath: ROUTES.PODCASTS,
      router,
    });
  };

  return (
    <>
      {isSubscribed && <HowToStartInfo rows={channels} totalPages={totalPages} />}
      {isSubscribed && (
        <p
          className={isFiltering ? styles.resultsCount : styles.resultsCountIdle}
          data-testid="podcasts-filter-results-count"
          role="status"
        >
          {isFiltering
            ? tSubscriptions('filter.results_count', { count: filtered.matchCount })
            : ''}
        </p>
      )}
      {showNoFilterMatches && (
        <InfoWrapper>
          <p>{tSubscriptions('no_filter_matches')}</p>
        </InfoWrapper>
      )}
      <CorePodcasts
        page={isFiltering ? filtered.page : page}
        setPage={
          isFiltering
            ? setFilteredPage
            : (nextPage) => setFilterParams({ ...filterParams, page: nextPage })
        }
        channels={isFiltering ? filtered.channels : channels}
        totalPages={isFiltering ? filtered.totalPages : totalPages}
        showSubscribeMessage={showSubscribeMessage}
        type={type}
        category={category}
        unseenBadges={unseenBadges}
        viewSelected={viewSelected}
      />
      <WebLoadingSpinnerOverlay isLoading={isLoading || fullList.isLoading} />
      <ModalCategoriesSelect
        isOpen={showCategoriesModal}
        onCategoryClick={handleOnClickCategory}
        setIsOpen={setShowCategoriesModal}
      />
    </>
  );
};
