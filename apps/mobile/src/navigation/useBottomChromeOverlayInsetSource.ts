import { StyleSheet } from 'react-native';

import { useMembershipExpiryStripVisible } from '../components/feedback/membershipExpiryStripPresence';
import { useNowPlayingSegmentStripVisible } from '../components/player/nowPlayingSegmentStripPresence';
import { useMiniPlayerVisible } from '../components/player/useMiniPlayerVisible';
import { countInProgressDownloads } from '../downloads/inProgressDownloadCount';
import { useDownloadsList } from '../downloads/useDownloads';
import { useOfflineStatus } from '../prefs/offlineStatus';
import { useSyncIndicatorPresentation } from '../sync/syncIndicatorPresentation';
import {
  bottomChromeStripOverlayHeight,
  globalActivityBarLayout,
  miniPlayerOverlayHeight,
} from '../theme/bottomChromeOverlay';
import { useTheme } from '../theme/useTheme';

/**
 * Height of everything the tab scaffold draws above the tab bar, computed in the same render as
 * those bars. The segment and membership strips publish presence through stores so the overlap
 * margin does not reserve space while a dismissal is still loading, and so the playhead does not
 * re-render the tab tree.
 */
export function useBottomChromeOverlayInsetSource(): number {
  const { tokens } = useTheme();
  const syncVisible = useSyncIndicatorPresentation().visible;
  const { downloads } = useDownloadsList();
  const { cause } = useOfflineStatus();
  const miniPlayerVisible = useMiniPlayerVisible();
  const segmentVisible = useNowPlayingSegmentStripVisible();
  const membershipVisible = useMembershipExpiryStripVisible();

  const downloadsVisible = countInProgressDownloads(downloads) > 0;
  const activityHeight = globalActivityBarLayout({
    borderTopWidth: StyleSheet.hairlineWidth,
    downloadsVisible,
    spacing: tokens.spacing,
    syncVisible,
  }).overlayHeight;

  return (
    activityHeight +
    bottomChromeStripOverlayHeight(cause !== null, tokens.spacing) +
    bottomChromeStripOverlayHeight(segmentVisible, tokens.spacing) +
    bottomChromeStripOverlayHeight(membershipVisible, tokens.spacing) +
    miniPlayerOverlayHeight(miniPlayerVisible)
  );
}
