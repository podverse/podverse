import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';

import { PeoplePane, toAboutPersonFromChannel } from '../../../components/content';
import type { ChannelBrowseStackParamList } from '../../../navigation';
import type { PodcastSectionPaneProps } from './podcastSectionPane';

/**
 * Podcast People chip — people credited on the channel.
 */
export function PodcastPeopleSection({
  channel,
  channelIdText,
  isChannelLoading,
  listHeader,
}: PodcastSectionPaneProps) {
  const navigation = useNavigation<NativeStackNavigationProp<ChannelBrowseStackParamList>>();
  const people = useMemo(
    () => (channel?.channel_persons ?? []).map(toAboutPersonFromChannel),
    [channel]
  );

  return (
    <PeoplePane
      appearanceChannelIdText={channelIdText}
      isLoading={isChannelLoading && channel === null}
      listHeader={listHeader}
      onOpenPerson={(personId) => {
        navigation.navigate('PersonDetail', { personId });
      }}
      people={people}
      testIDPrefix="podcast-detail"
    />
  );
}
