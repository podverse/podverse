import { useLocale, useTranslations } from 'next-intl';

import type { DTORemoteItemStub } from '@podverse/helpers';
import { buildIndexProviderFeedPath, formatDateTimeAbbrev, formatHHMMSS } from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';
import { WEB } from '../../../constants/web';
import { Link } from '../../Link/Link';
import { nonEmptyTrimmed } from '../remoteItemStubRow';

import styles from '../../../styles/components/Content/Podroll/ContentPodrollItemRow.module.scss';

type ContentPodrollItemUnaddedRowProps = {
  itemUnadded: DTORemoteItemStub;
};

export const ContentPodrollItemUnaddedRow = ({
  itemUnadded,
}: ContentPodrollItemUnaddedRowProps) => {
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const locale = useLocale();
  const itemTitle = nonEmptyTrimmed(itemUnadded.title);
  const titleText = itemTitle ?? tMisc('untitled');
  const channelTitle = nonEmptyTrimmed(itemUnadded.channel_stub.title);
  const artworkUrl =
    nonEmptyTrimmed(itemUnadded.image_url) ?? nonEmptyTrimmed(itemUnadded.channel_stub.image_url);
  const imageCandidates = artworkUrl === null ? [] : [artworkUrl];
  const metaParts: string[] = [];
  if (itemUnadded.pub_date !== null) {
    metaParts.push(formatDateTimeAbbrev(itemUnadded.pub_date, locale));
  }
  if (typeof itemUnadded.duration_seconds === 'number' && itemUnadded.duration_seconds > 0) {
    metaParts.push(formatHHMMSS(itemUnadded.duration_seconds));
  }
  const metaLine = metaParts.length > 0 ? metaParts.join(' · ') : null;

  return (
    <div className={styles.row}>
      <Link
        className={styles.link}
        href={`${WEB.origin}${buildIndexProviderFeedPath(
          itemUnadded.channel_stub.index_provider,
          itemUnadded.channel_stub.provider_feed_id
        )}`}
        color="secondary"
      >
        <SkeletonFlashImage
          className={styles.image}
          candidates={imageCandidates}
          alt={itemTitle ?? tMedia('image')}
          width={IMAGES.PODROLL.SQUARE.SIZE}
          height={IMAGES.PODROLL.SQUARE.SIZE}
        />
        <div className={styles.textWrapper}>
          <div className={styles.title}>{titleText}</div>
          {channelTitle !== null ? <div className={styles.subtitle}>{channelTitle}</div> : null}
          {metaLine !== null ? <div className={styles.subtitle}>{metaLine}</div> : null}
        </div>
      </Link>
    </div>
  );
};
