import { useTranslations } from 'next-intl';

import type { DTOLiveItem } from '@podverse/helpers';
import { LiveItemStatusEnum } from '@podverse/helpers';

import type { ButtonVariant } from '../Button/Button';
import { Button } from '../Button/Button';

import styles from '../../styles/components/LiveItem/LiveItemStatus.module.scss';

type LiveItemStatusProps = {
  live_item: DTOLiveItem;
};

export const LiveItemStatus = ({ live_item }: LiveItemStatusProps) => {
  const tMedia = useTranslations('media');

  let statusText = tMedia('livestream.pending');
  let variant: ButtonVariant = 'miniGlow';
  const live_item_status_id = live_item.live_item_status?.id || live_item.live_item_status_id;
  if (live_item_status_id === LiveItemStatusEnum.Live) {
    statusText = tMedia('livestream.live');
    variant = 'miniGlowDanger';
  } else if (live_item_status_id === LiveItemStatusEnum.Ended) {
    statusText = tMedia('livestream.ended');
    variant = 'miniGlowWarning';
  }

  return (
    <Button className={styles.button} variant={variant} tabIndex={-1}>
      {statusText}
    </Button>
  );
};
