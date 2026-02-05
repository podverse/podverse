'use client';

import type { DTOChannel } from '@podverse/helpers';

import { CommonArtistHeaderViewDesktop } from '../../Common/Artist/CommonArtistHeaderViewDesktop';
import { Link } from '../../Link/Link';
import { ROUTES } from '../../../constants/routes';
import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeaderViewDesktop.module.scss';
import { ArtistHeaderButtons } from '../../Media/Music/Artist/ArtistHeaderButtons';
import { ArtistHeaderImage } from '../../Media/Music/Artist/ArtistHeaderImage';
import { ArtistHeaderSubtitle } from '../../Media/Music/Artist/ArtistHeaderSubtitle';

type CoreArtistHeaderViewDesktopProps = {
  channel: DTOChannel;
};

export const CoreArtistHeaderViewDesktop: React.FC<CoreArtistHeaderViewDesktopProps> = ({
  channel,
}) => {
  return (
    <CommonArtistHeaderViewDesktop
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
