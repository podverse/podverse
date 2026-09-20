import { FundingLinksSection } from '../../../components/content';
import type { PodcastSectionPaneProps } from './podcastSectionPane';

/**
 * Podcast Funding chip — publisher support links from `channel_fundings`.
 */
export function PodcastFundingSection({
  channel,
  isChannelLoading,
  listHeader,
}: PodcastSectionPaneProps) {
  return (
    <FundingLinksSection
      fundings={channel?.channel_fundings ?? []}
      isLoading={isChannelLoading && channel === null}
      listHeader={listHeader}
      testIDPrefix="podcast-detail"
    />
  );
}
