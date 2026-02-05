'use client';

import type { DTOChannel } from '@podverse/helpers';

import { CommonArtistHeaderViewTablet } from '../../Common/Artist/CommonArtistHeaderViewTablet';
import { Link } from '../../Link/Link';
import { ROUTES } from '../../../constants/routes';
import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeaderViewTablet.module.scss';
import { ArtistHeaderButtons } from '../../Media/Music/Artist/ArtistHeaderButtons';
import { ArtistHeaderImage } from '../../Media/Music/Artist/ArtistHeaderImage';
import { ArtistHeaderSubtitle } from '../../Media/Music/Artist/ArtistHeaderSubtitle';

type CoreArtistHeaderViewTabletProps = {
  channel: DTOChannel;
};

export const CoreArtistHeaderViewTablet: React.FC<CoreArtistHeaderViewTabletProps> = ({
  channel,
}) => {
  return (
    <CommonArtistHeaderViewTablet
      imageNode={<ArtistHeaderImage channel={channel} />}
      titleNode={
        <Link href={`${ROUTES.ARTIST}/${channel.id_text}`}>
          <h1 className={styles.title}>{channel.title}</h1>
        </Link>
      }
      subtitleNode={<ArtistHeaderSubtitle channel={channel} />}
      buttonsNode={<ArtistHeaderButtons channel={channel} />}
    />
  );
};
