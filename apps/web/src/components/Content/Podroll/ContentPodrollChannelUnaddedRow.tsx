import { useTranslations } from 'next-intl';

import type { DTORemoteChannelStub } from '@podverse/helpers';
import { buildIndexProviderFeedPath } from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';
import { WEB } from '../../../constants/web';
import { Link } from '../../Link/Link';
import { nonEmptyTrimmed } from '../remoteItemStubRow';

import styles from '../../../styles/components/Content/Podroll/ContentPodrollChannelRow.module.scss';

type ContentPodrollChannelUnaddedRowProps = {
  channelUnadded: DTORemoteChannelStub;
};

export const ContentPodrollChannelUnaddedRow = ({
  channelUnadded,
}: ContentPodrollChannelUnaddedRowProps) => {
  const tMisc = useTranslations('misc');
  const titleText = nonEmptyTrimmed(channelUnadded.title) ?? tMisc('untitled');
  const author = nonEmptyTrimmed(channelUnadded.author);
  const imageUrl = nonEmptyTrimmed(channelUnadded.image_url);
  const imageCandidates = imageUrl === null ? [] : [imageUrl];

  return (
    <div className={styles.row}>
      <Link
        className={styles.link}
        href={`${WEB.origin}${buildIndexProviderFeedPath(
          channelUnadded.index_provider,
          channelUnadded.provider_feed_id
        )}`}
        color="secondary"
      >
        <SkeletonFlashImage
          className={styles.image}
          candidates={imageCandidates}
          alt={titleText}
          width={IMAGES.PODROLL.SQUARE.SIZE}
          height={IMAGES.PODROLL.SQUARE.SIZE}
        />
        <div className={styles.textWrapper}>
          <div className={styles.title}>{titleText}</div>
          {author !== null ? <div className={styles.subtitle}>{author}</div> : null}
        </div>
      </Link>
    </div>
  );
};
