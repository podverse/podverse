'use client';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';

import { CommonPodcastHeaderViewTablet } from '../../Common/Podcast/CommonPodcastHeaderViewTablet';
import { Link } from '../../Link/Link';
import { ROUTES } from '../../../constants/routes';
import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeaderViewTablet.module.scss';
import { CorePodcastHeaderButtons } from './CorePodcastHeaderButtons';
import { CorePodcastHeaderImage } from './CorePodcastHeaderImage';
import { CorePodcastHeaderSubtitle } from './CorePodcastHeaderSubtitle';

type CorePodcastHeaderViewTabletProps = {
  channel: DTOChannel;
  item?: DTOItem;
  clip?: DTOClip;
  item_soundbite?: DTOItemSoundbite;
  item_chapter?: DTOItemChapter;
};

export const CorePodcastHeaderViewTablet: React.FC<CorePodcastHeaderViewTabletProps> = ({
  channel,
  item,
  clip,
  item_soundbite,
  item_chapter,
}) => {
  return (
    <CommonPodcastHeaderViewTablet
      imageNode={<CorePodcastHeaderImage channel={channel} item={item} />}
      titleNode={
        <Link href={`${ROUTES.PODCAST}/${channel.id_text}`}>
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
