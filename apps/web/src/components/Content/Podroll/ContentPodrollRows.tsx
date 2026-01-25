import { RemoteItemsResponse } from '@podverse/helpers';
import { ContentPodrollChannelRow } from './ContentPodrollChannelRow';
import { ContentPodrollChannelUnaddedRow } from './ContentPodrollChannelUnaddedRow';
import { ContentPodrollItemRow } from './ContentPodrollItemRow';
import { ContentPodrollItemUnaddedRow } from './ContentPodrollItemUnaddedRow';
import styles from '../../../styles/components/Content/Podroll/ContentPodroll.module.scss';

type ContentPodrollProps = {
  remoteItemsResponse: RemoteItemsResponse;
}

export const ContentPodrollRows = ({ remoteItemsResponse }: ContentPodrollProps) => {
  const channelAddedNodes = remoteItemsResponse?.channelsAdded?.map((channel) => {
    return (
      <ContentPodrollChannelRow key={channel.id} channel={channel} />
    );
  });

  const channelUnaddedNodes = remoteItemsResponse?.channelsUnadded?.map((channelUnadded) => {
    return (
      <ContentPodrollChannelUnaddedRow key={channelUnadded.id} channelUnadded={channelUnadded} />
    );
  });

  const itemAddedNodes = remoteItemsResponse?.itemsAdded?.map((item) => {
    return (
      <ContentPodrollItemRow key={item.id} item={item} />
    );
  });

  const itemUnaddedNodes = remoteItemsResponse?.itemsUnadded?.map((itemUnadded) => {
    if (!itemUnadded) {
      return null;
    }

    // itemUnadded can have different shapes from Podcast Index API
    type ItemUnaddedWithId = typeof itemUnadded & { guid?: string; id?: number };
    const itemWithId = itemUnadded as ItemUnaddedWithId;
    const key = itemWithId.guid || itemWithId.id || `item-unadded-${Math.random()}`;

    return (
      <ContentPodrollItemUnaddedRow key={key} itemUnadded={itemUnadded} />
    );
  });

  return (
    <div className={styles.rows}>
      {channelAddedNodes}
      {channelUnaddedNodes}
      {itemAddedNodes}
      {itemUnaddedNodes}
    </div>
  );
};
