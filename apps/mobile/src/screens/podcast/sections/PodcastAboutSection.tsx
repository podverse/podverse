import { ChannelAboutSection } from '../../../components/content';
import type { PodcastSectionPaneProps } from './podcastSectionPane';

/**
 * Podcast About chip — channel description, tucked RSS and website links, and people.
 */
export function PodcastAboutSection({
  channel,
  isChannelLoading,
  listHeader,
}: PodcastSectionPaneProps) {
  return (
    <ChannelAboutSection
      channel={channel}
      isChannelLoading={isChannelLoading}
      listHeader={listHeader}
      testIDPrefix="podcast-detail"
    />
  );
}
