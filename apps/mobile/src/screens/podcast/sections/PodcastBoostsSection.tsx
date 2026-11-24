import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import type { DTOItem } from '@podverse/helpers/dto';

import {
  directoryBoostItemRoute,
  ReceivedBoostsSection,
} from '../../../components/boost/ReceivedBoostsSection';
import type { ChannelBrowseStackParamList } from '../../../navigation';
import { CHANNEL_BROWSE_STACK_ROUTES } from '../../../navigation';
import type { PodcastSectionPaneProps } from './podcastSectionPane';

/**
 * Podcast Boosts chip. Filter, sort, and range do not apply to the public message list.
 */
export function PodcastBoostsSection({
  channel,
  channelIdText,
  listHeader,
}: PodcastSectionPaneProps) {
  const navigation = useNavigation<NativeStackNavigationProp<ChannelBrowseStackParamList>>();

  const onOpenDirectoryItem = useCallback(
    (item: DTOItem) => {
      const destination = directoryBoostItemRoute(item, channel?.medium_id);
      if (destination.kind === 'track') {
        navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.TrackDetail, destination.params);
        return;
      }
      navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.EpisodeDetail, destination.params);
    },
    [channel?.medium_id, navigation]
  );

  return (
    <ReceivedBoostsSection
      channel={channel}
      directoryChannelIdText={channel?.id_text ?? channelIdText}
      fetchAllowed={channel !== null}
      listHeader={listHeader}
      onOpenDirectoryItem={onOpenDirectoryItem}
      scopeType="channel"
      testIDPrefix="podcast-detail-boosts"
    />
  );
}
