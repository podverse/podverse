'use client';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';

import { ROUTES } from '../../../constants/routes';
import { CommonPodcastHeaderViewDesktop } from '../../Common/Podcast/CommonPodcastHeaderViewDesktop';
import { Link } from '../../Link/Link';
import { CorePodcastHeaderButtons } from './CorePodcastHeaderButtons';
import { CorePodcastHeaderImage } from './CorePodcastHeaderImage';
import { CorePodcastHeaderSubtitle } from './CorePodcastHeaderSubtitle';

import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeaderViewDesktop.module.scss';

type CorePodcastHeaderViewDesktopProps = {
  channel: DTOChannel;
  item?: DTOItem;
  clip?: DTOClip;
  item_soundbite?: DTOItemSoundbite;
  item_chapter?: DTOItemChapter;
};

export const CorePodcastHeaderViewDesktop: React.FC<CorePodcastHeaderViewDesktopProps> = ({
  channel,
  item,
  clip,
  item_soundbite,
  item_chapter,
}) => {
  return (
    <CommonPodcastHeaderViewDesktop
      imageNode={<CorePodcastHeaderImage channel={channel} />}
      titleNode={
        <Link className={styles.titleLink} href={`${ROUTES.PODCAST}/${channel.id_text}`}>
          <h1 className={styles.title}>{channel.title}</h1>
        </Link>
      }
      subtitleNode={<CorePodcastHeaderSubtitle channel={channel} />}
      buttonsNode={
        <CorePodcastHeaderButtons
          channel={channel}
          item={item}
          clip={clip}
          item_soundbite={item_soundbite}
          item_chapter={item_chapter}
        />
      }
    />
  );
};
