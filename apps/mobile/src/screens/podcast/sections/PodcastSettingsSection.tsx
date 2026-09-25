import { ChannelSettingsPane } from '../../../components/channel';
import type { PodcastSectionPaneProps } from './podcastSectionPane';

/**
 * Podcast Settings chip — RSS feed status, notifications, and deferred auto-download.
 */
export function PodcastSettingsSection({ channel, notifications }: PodcastSectionPaneProps) {
  if (notifications === undefined) {
    return null;
  }

  return (
    <ChannelSettingsPane
      channel={channel}
      notifications={notifications}
      testIDPrefix="podcast-detail"
    />
  );
}
