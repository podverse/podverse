import { useTranslations } from 'next-intl';

import type { PodcastBatchByFeedGuidResponse } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { WEB } from '../../../constants/web';
import { SkeletonFlashImage } from '../../Image/SkeletonFlashImage';
import { Link } from '../../Link/Link';

import styles from '../../../styles/components/Content/Podroll/ContentPodrollChannelRow.module.scss';

type ContentPodrollChannelUnaddedRowProps = {
  channelUnadded: PodcastBatchByFeedGuidResponse['feeds'][number];
};

export const ContentPodrollChannelUnaddedRow = ({
  channelUnadded,
}: ContentPodrollChannelUnaddedRowProps) => {
  if (!channelUnadded) {
    return null;
  }

  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const imageCandidates =
    typeof channelUnadded.image === 'string' && channelUnadded.image.trim() !== ''
      ? [channelUnadded.image.trim()]
      : [];

  return (
    <div className={styles.row}>
      <Link
        className={styles.link}
        href={`${WEB.origin}/podcast-index/feed/${channelUnadded.id}`}
        color="secondary"
      >
        <SkeletonFlashImage
          className={styles.image}
          candidates={imageCandidates}
          alt={channelUnadded.title || tMedia('image')}
          width={IMAGES.PODROLL.SQUARE.SIZE}
          height={IMAGES.PODROLL.SQUARE.SIZE}
        />
        <div className={styles.textWrapper}>
          <div className={styles.title}>{channelUnadded.title || tMisc('untitled')}</div>
        </div>
      </Link>
    </div>
  );
};
