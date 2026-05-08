import { useTranslations } from 'next-intl';

import type { EpisodeByGuidResponse } from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';
import { WEB } from '../../../constants/web';
import { Link } from '../../Link/Link';

import styles from '../../../styles/components/Content/Podroll/ContentPodrollItemRow.module.scss';

type ContentPodrollItemUnaddedRowProps = {
  itemUnadded: EpisodeByGuidResponse['episode'];
};

export const ContentPodrollItemUnaddedRow = ({
  itemUnadded,
}: ContentPodrollItemUnaddedRowProps) => {
  if (!itemUnadded) {
    return null;
  }

  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const imageCandidates =
    typeof itemUnadded.image === 'string' && itemUnadded.image.trim() !== ''
      ? [itemUnadded.image.trim()]
      : [];

  return (
    <div className={styles.row}>
      <Link
        className={styles.link}
        href={`${WEB.origin}/podcast-index/feed/${itemUnadded.feedId}`}
        color="secondary"
      >
        <SkeletonFlashImage
          className={styles.image}
          candidates={imageCandidates}
          alt={itemUnadded.title || tMedia('image')}
          width={IMAGES.PODROLL.SQUARE.SIZE}
          height={IMAGES.PODROLL.SQUARE.SIZE}
        />
        <div className={styles.textWrapper}>
          <div className={styles.title}>{itemUnadded.feedTitle || tMisc('untitled')}</div>
          <div className={styles.subtitle}>{itemUnadded.title || tMisc('untitled')}</div>
        </div>
      </Link>
    </div>
  );
};
