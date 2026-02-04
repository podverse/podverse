'use client';

import type { DTOChannel, DTOItem } from '@podverse/helpers';

import { CommonAlbumHeaderViewTablet } from '../../../Common/Artist/Album/CommonAlbumHeaderViewTablet';
import { Link } from '../../../Link/Link';
import { ROUTES } from '../../../../constants/routes';
import styles from '../../../../styles/components/Common/Media/Podcast/PodcastHeaderViewTablet.module.scss';
import { AlbumHeaderButtons } from '../../../Media/Music/Album/AlbumHeaderButtons';
import { AlbumHeaderImage } from '../../../Media/Music/Album/AlbumHeaderImage';
import { AlbumHeaderSubtitle } from '../../../Media/Music/Album/AlbumHeaderSubtitle';

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
      imageNode={<AlbumHeaderImage channel={channel} item={item} />}
      titleNode={
        <Link href={`${ROUTES.ALBUM}/${channel.id_text}`}>
          <h1 className={styles.title}>{channel.title}</h1>
        </Link>
      }
      subtitleNode={<AlbumHeaderSubtitle channel={channel} />}
      buttonsNode={<AlbumHeaderButtons channel={channel} item={item} />}
    />
  );
};
