import type { DTOChannel, RemoteItemsResponse } from '@podverse/helpers';
import { SideContent } from '../../../components/SideContent/SideContent';
import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import { ContentPodroll } from '../../../components/Content/Podroll/ContentPodroll';

type ArtistPageSideContentProps = {
  channel: DTOChannel;
  podroll: RemoteItemsResponse | null;
};

export const ArtistPageSideContent = ({ channel, podroll }: ArtistPageSideContentProps) => {
  return (
    <SideContent>
      <ContentAbout
        description={channel.channel_description?.value}
        channel_persons={channel.channel_persons}
        isAccordion={true}
        defaultOpen={true}
      />
      <ContentPodroll remoteItemsResponse={podroll} isAccordion={true} defaultOpen={true} />
    </SideContent>
  );
};
