'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import type { SearchPodcastsFeed } from '@podverse/helpers';
import { formatDateAbbrev } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { dedupedTrimmedUrlCandidates } from '../../../utils/image/dedupedTrimmedUrlCandidates';
import { redirectToChannelPageByMediumClient } from '../../../utils/redirect/redirectToChannelPageByMedium';
import { Image } from '../../Image/Image';
import { Link } from '../../Link/Link';

import styles from '../../../styles/components/List/SearchResults/ListSearchResultPodcastIndexFeedRow.module.scss';

interface Props {
  searchResultPodcastIndexFeed: SearchPodcastsFeed;
}

const ListSearchResultPodcastIndexFeedRow: React.FC<Props> = ({ searchResultPodcastIndexFeed }) => {
  const apiRequestService = getApiRequestService();
  const router = useRouter();
  const feedImageCandidates = dedupedTrimmedUrlCandidates([
    searchResultPodcastIndexFeed.image,
    searchResultPodcastIndexFeed.artwork,
  ]);
  const description = searchResultPodcastIndexFeed.description || '';
  const lastPubDate = searchResultPodcastIndexFeed.newestItemPubdate || null;
  const author = searchResultPodcastIndexFeed.author || null;
  const tMedia = useTranslations('media');
  const locale = useLocale();

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const ssrChannel = await apiRequestService.reqChannelGetByPodcastIndexId(
      searchResultPodcastIndexFeed.id
    );
    if (ssrChannel?.medium_id) {
      redirectToChannelPageByMediumClient(router)(ssrChannel.medium_id, ssrChannel.id_text);
    } else {
      const url = `${ROUTES.PODCAST_INDEX}/feed/${searchResultPodcastIndexFeed.id}`;
      router.push(url);
    }
  };

  return (
    <Link className={styles.link} onClick={handleClick}>
      <div className={styles.listItem}>
        <Image
          candidates={feedImageCandidates}
          alt={searchResultPodcastIndexFeed.title || tMedia('podcast.podcast_image')}
          width={IMAGES.LIST.SEARCH.SIZE}
          height={IMAGES.LIST.SEARCH.SIZE}
          className={styles.image}
        />
        <div className={styles.content}>
          <h3 className={styles.title}>{searchResultPodcastIndexFeed.title}</h3>
          {author && <div className={styles.author}>{author}</div>}
          {lastPubDate && (
            <span className={styles.lastPubDate}>
              {tMedia('updated_with_date', {
                date: formatDateAbbrev(lastPubDate, locale),
              })}
            </span>
          )}
          {description && <div className={styles.description}>{description}</div>}
        </div>
      </div>
    </Link>
  );
};

export default ListSearchResultPodcastIndexFeedRow;
