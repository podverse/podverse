import type { RemoteItemsResponse } from '@podverse/helpers';

import { ContentExpandableRows } from '../ContentExpandableRows';
import { ContentPodrollChannelRow } from './ContentPodrollChannelRow';
import { ContentPodrollChannelUnaddedRow } from './ContentPodrollChannelUnaddedRow';
import { ContentPodrollItemRow } from './ContentPodrollItemRow';
import { ContentPodrollItemUnaddedRow } from './ContentPodrollItemUnaddedRow';

import styles from '../../../styles/components/Content/Podroll/ContentPodroll.module.scss';

type ContentPodrollProps = {
  remoteItemsResponse: RemoteItemsResponse;
};

const getItemUnaddedKey = (
  itemUnadded: NonNullable<RemoteItemsResponse['itemsUnadded'][number]>,
  index: number
) => {
  if (typeof itemUnadded === 'object' && itemUnadded !== null) {
    if (
      'guid' in itemUnadded &&
      typeof itemUnadded.guid === 'string' &&
      itemUnadded.guid.length > 0
    ) {
      return itemUnadded.guid;
    }

    if ('id' in itemUnadded && typeof itemUnadded.id === 'number') {
      return itemUnadded.id;
    }
  }

  return `item-unadded-${index}`;
};

export const ContentPodrollRows = ({ remoteItemsResponse }: ContentPodrollProps) => {
  const channelAddedRows = remoteItemsResponse.channelsAdded.map((channel) => {
    return <ContentPodrollChannelRow key={channel.id} channel={channel} />;
  });

  const channelUnaddedRows = remoteItemsResponse.channelsUnadded.map((channelUnadded) => {
    return (
      <ContentPodrollChannelUnaddedRow key={channelUnadded.id} channelUnadded={channelUnadded} />
    );
  });

  const itemAddedRows = remoteItemsResponse.itemsAdded.map((item) => {
    return <ContentPodrollItemRow key={item.id} item={item} />;
  });

  const itemUnaddedRows = (remoteItemsResponse.itemsUnadded ?? []).flatMap((itemUnadded, index) => {
    if (!itemUnadded) {
      return [];
    }

    return [
      <ContentPodrollItemUnaddedRow
        key={getItemUnaddedKey(itemUnadded, index)}
        itemUnadded={itemUnadded}
      />,
    ];
  });

  const rows = [...channelAddedRows, ...channelUnaddedRows, ...itemAddedRows, ...itemUnaddedRows];

  return <ContentExpandableRows rows={rows} rowsClassName={styles.rows} />;
};
