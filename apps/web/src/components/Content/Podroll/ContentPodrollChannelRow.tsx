import { useTranslations } from 'next-intl';

import type { DTOChannel } from '@podverse/helpers';
import { buildDTOChannelImageLoadCandidates } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { WEB } from '../../../constants/web';
import { SkeletonFlashImage } from '../../Image/SkeletonFlashImage';
import { Link } from '../../Link/Link';

import styles from '../../../styles/components/Content/Podroll/ContentPodrollChannelRow.module.scss';

type ContentPodrollChannelRowProps = {
  channel: DTOChannel;
};

export const ContentPodrollChannelRow = ({ channel }: ContentPodrollChannelRowProps) => {
  if (!channel) {
    return null;
  }

  const tMedia = useTranslations('media');
  const imageCandidates = buildDTOChannelImageLoadCandidates(
    channel.channel_images,
    IMAGES.PODROLL.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );

  return (
    <div className={styles.row}>
      <Link
        className={styles.link}
        href={`${WEB.origin}/podcast/${channel.id_text}`}
        color="secondary"
      >
        <SkeletonFlashImage
          className={styles.image}
          candidates={imageCandidates}
          alt={channel.title || tMedia('image')}
          width={IMAGES.PODROLL.SQUARE.SIZE}
          height={IMAGES.PODROLL.SQUARE.SIZE}
        />
        <div className={styles.textWrapper}>
          <div className={styles.title}>{channel.title}</div>
        </div>
      </Link>
    </div>
  );
};
