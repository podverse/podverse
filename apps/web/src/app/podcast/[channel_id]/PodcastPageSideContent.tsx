import type { DTOChannel, RemoteItemsResponse } from '@podverse/helpers';
import { isDescriptionTruncated } from '@podverse/helpers';
import { SideContent } from '@podverse/ui';

import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import { ContentPeopleAccordion } from '../../../components/Content/About/ContentPeopleAccordion';
import { ContentPodroll } from '../../../components/Content/Podroll/ContentPodroll';
import { ContentRemoteItems } from '../../../components/Content/RemoteItems/ContentRemoteItems';

type PodcastPageSideContentProps = {
  channel: DTOChannel;
  podroll: RemoteItemsResponse | null;
  remoteItems: RemoteItemsResponse | null;
};

export const PodcastPageSideContent = ({
  channel,
  podroll,
  remoteItems,
}: PodcastPageSideContentProps) => {
  return (
    <SideContent>
      <ContentAbout
        description={channel.channel_description?.value}
        isTruncated={isDescriptionTruncated(channel.channel_description)}
        fullDescriptionUrl={channel.channel_about?.website_link_url}
        isAccordion={true}
        defaultOpen={true}
      />
      <ContentPeopleAccordion channel_persons={channel.channel_persons} defaultOpen={true} />
      <ContentPodroll remoteItemsResponse={podroll} isAccordion={true} defaultOpen={true} />
      <ContentRemoteItems remoteItemsResponse={remoteItems} isAccordion={true} defaultOpen={true} />
    </SideContent>
  );
};
