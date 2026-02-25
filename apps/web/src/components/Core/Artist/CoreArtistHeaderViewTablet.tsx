'use client';

import type { DTOChannel } from '@podverse/helpers';

import { CommonArtistHeaderViewTablet } from '../../Common/Artist/CommonArtistHeaderViewTablet';
import { Link } from '../../Link/Link';
import { ROUTES } from '../../../constants/routes';
import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeaderViewTablet.module.scss';
import { CoreArtistHeaderButtons } from './CoreArtistHeaderButtons';
import { CoreArtistHeaderImage } from './CoreArtistHeaderImage';
import { CoreArtistHeaderSubtitle } from './CoreArtistHeaderSubtitle';

type CoreArtistHeaderViewTabletProps = {
  channel: DTOChannel;
};

export const CoreArtistHeaderViewTablet: React.FC<CoreArtistHeaderViewTabletProps> = ({
  channel,
}) => {
  return (
    <CommonArtistHeaderViewTablet
      imageNode={<CoreArtistHeaderImage channel={channel} />}
      titleNode={
        <Link href={`${ROUTES.ARTIST}/${channel.id_text}`}>
          <h1 className={styles.title}>{channel.title}</h1>
        </Link>
      }
      subtitleNode={<CoreArtistHeaderSubtitle channel={channel} />}
      buttonsNode={<CoreArtistHeaderButtons channel={channel} />}
    />
  );
};
