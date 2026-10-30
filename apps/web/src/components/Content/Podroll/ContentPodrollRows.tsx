import type { RemoteItemsResponse } from '@podverse/helpers';

import { ContentExpandableRows } from '../ContentExpandableRows';
import { remoteChannelStubRowKey, remoteItemStubRowKey } from '../remoteItemStubRow';
import { ContentPodrollChannelRow } from './ContentPodrollChannelRow';
import { ContentPodrollChannelUnaddedRow } from './ContentPodrollChannelUnaddedRow';
import { ContentPodrollItemRow } from './ContentPodrollItemRow';
import { ContentPodrollItemUnaddedRow } from './ContentPodrollItemUnaddedRow';

import styles from '../../../styles/components/Content/Podroll/ContentPodroll.module.scss';

type ContentPodrollProps = {
  remoteItemsResponse: RemoteItemsResponse;
};

export const ContentPodrollRows = ({ remoteItemsResponse }: ContentPodrollProps) => {
  const channelAddedRows = remoteItemsResponse.channelsAdded.map((channel) => {
    return <ContentPodrollChannelRow key={channel.id} channel={channel} />;
  });

  const channelUnaddedRows = remoteItemsResponse.channelsUnadded.map((channelUnadded) => {
    return (
      <ContentPodrollChannelUnaddedRow
        key={remoteChannelStubRowKey(channelUnadded)}
        channelUnadded={channelUnadded}
      />
    );
  });

  const itemAddedRows = remoteItemsResponse.itemsAdded.map((item) => {
    return <ContentPodrollItemRow key={item.id} item={item} />;
  });

  const itemUnaddedRows = remoteItemsResponse.itemsUnadded.map((itemUnadded) => {
    return (
      <ContentPodrollItemUnaddedRow
        key={remoteItemStubRowKey(itemUnadded)}
        itemUnadded={itemUnadded}
      />
    );
  });

  const rows = [...channelAddedRows, ...channelUnaddedRows, ...itemAddedRows, ...itemUnaddedRows];

  return <ContentExpandableRows rows={rows} rowsClassName={styles.rows} />;
};
