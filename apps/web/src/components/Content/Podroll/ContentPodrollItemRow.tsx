import { useTranslations } from 'next-intl';

import type { DTOItem } from '@podverse/helpers';
import { buildDTOItemImageLoadCandidates } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { WEB } from '../../../constants/web';
import { SkeletonFlashImage } from '../../Image/SkeletonFlashImage';
import { Link } from '../../Link/Link';

import styles from '../../../styles/components/Content/Podroll/ContentPodrollItemRow.module.scss';

type ContentPodrollItemRowProps = {
  item: DTOItem;
};

export const ContentPodrollItemRow = ({ item }: ContentPodrollItemRowProps) => {
  if (!item || !item.channel) {
    return null;
  }

  const tMedia = useTranslations('media');
  const imageCandidates = buildDTOItemImageLoadCandidates(
    item.item_images,
    IMAGES.PODROLL.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );

  return (
    <div className={styles.row}>
      <Link
        className={styles.link}
        href={`${WEB.origin}/episode/${item.id_text}`}
        color="secondary"
      >
        <SkeletonFlashImage
          className={styles.image}
          candidates={imageCandidates}
          alt={item.title || tMedia('image')}
          width={IMAGES.PODROLL.SQUARE.SIZE}
          height={IMAGES.PODROLL.SQUARE.SIZE}
        />
        <div className={styles.textWrapper}>
          <div className={styles.title}>{item.channel.title}</div>
          <div className={styles.subtitle}>{item.title}</div>
        </div>
      </Link>
    </div>
  );
};
