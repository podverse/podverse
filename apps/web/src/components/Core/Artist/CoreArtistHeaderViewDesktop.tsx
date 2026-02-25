'use client';

import type { DTOChannel } from '@podverse/helpers';

import { CommonArtistHeaderViewDesktop } from '../../Common/Artist/CommonArtistHeaderViewDesktop';
import { Link } from '../../Link/Link';
import { ROUTES } from '../../../constants/routes';
import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeaderViewDesktop.module.scss';
import { CoreArtistHeaderButtons } from './CoreArtistHeaderButtons';
import { CoreArtistHeaderImage } from './CoreArtistHeaderImage';
import { CoreArtistHeaderSubtitle } from './CoreArtistHeaderSubtitle';

type CoreArtistHeaderViewDesktopProps = {
  channel: DTOChannel;
};

export const CoreArtistHeaderViewDesktop: React.FC<CoreArtistHeaderViewDesktopProps> = ({
  channel,
}) => {
  return (
    <CommonArtistHeaderViewDesktop
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
