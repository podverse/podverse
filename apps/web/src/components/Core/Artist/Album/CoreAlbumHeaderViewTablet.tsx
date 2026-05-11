'use client';

import type { DTOChannel, DTOItem } from '@podverse/helpers';

import { ROUTES } from '../../../../constants/routes';
import { CommonAlbumHeaderViewTablet } from '../../../Common/Artist/Album/CommonAlbumHeaderViewTablet';
import { Link } from '../../../Link/Link';
import { CoreAlbumHeaderButtons } from './CoreAlbumHeaderButtons';
import { CoreAlbumHeaderImage } from './CoreAlbumHeaderImage';
import { CoreAlbumHeaderSubtitle } from './CoreAlbumHeaderSubtitle';

import styles from '../../../../styles/components/Common/Media/Podcast/PodcastHeaderViewTablet.module.scss';

type CoreAlbumHeaderViewTabletProps = {
  channel: DTOChannel;
  item?: DTOItem;
};

export const CoreAlbumHeaderViewTablet: React.FC<CoreAlbumHeaderViewTabletProps> = ({
  channel,
  item,
}) => {
  return (
    <CommonAlbumHeaderViewTablet
      imageNode={<CoreAlbumHeaderImage channel={channel} />}
      titleNode={
        <Link className={styles.titleLink} href={`${ROUTES.ALBUM}/${channel.id_text}`}>
          <h1 className={styles.title}>{channel.title}</h1>
        </Link>
      }
      subtitleNode={<CoreAlbumHeaderSubtitle channel={channel} />}
      buttonsNode={<CoreAlbumHeaderButtons channel={channel} item={item} />}
    />
  );
};
