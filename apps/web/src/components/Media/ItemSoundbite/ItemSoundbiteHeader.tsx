import React from 'react';

import type { DTOChannel, DTOItem, DTOItemSoundbite } from '@podverse/helpers';

import { ROUTES } from '../../../constants/routes';
import { Link } from '../../Link/Link';
import { ItemSoundbiteHeaderPlaySection } from './ItemSoundbiteHeaderPlaySection';

import styles from '../../../styles/components/Media/ItemSoundbite/ItemSoundbiteHeader.module.scss';

type ItemSoundbiteHeaderProps = {
  channel: DTOChannel;
  item: DTOItem;
  item_soundbite: DTOItemSoundbite;
};

export const ItemSoundbiteHeader: React.FC<ItemSoundbiteHeaderProps> = ({
  item_soundbite,
  item,
  channel,
}) => {
  return (
    <header>
      <Link className={styles.episodeTitleLink} href={`${ROUTES.EPISODE}/${item.id_text}`}>
        <h2 className={styles.episodeTitle}>{item.title || 'Untitled'}</h2>
      </Link>
      <h3 className={styles.officialClipTitle}>{item_soundbite.title || 'Untitled'}</h3>
      <ItemSoundbiteHeaderPlaySection
        item={item}
        channel={channel}
        item_soundbite={item_soundbite}
      />
    </header>
  );
};
