import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useLiveMediaSnapshot } from '../../../hooks/useLiveMediaSnapshot';
import { useRemotePlayerDisplay } from '../../../hooks/useRemotePlayerDisplay';
import { isPlayerResourceLive } from '../../../lib/crossDevicePlayback/playbackResource';
import { RemoteLiveLabel } from '../CrossDevice/RemoteLiveLabel';
import { MediaPlayerProgress } from '../Sliders/MediaPlayerProgress';

import styles from '../../../styles/components/MediaPlayer/Mobile/MediaPlayerControlsMobile.module.scss';

export const MediaPlayerControlsMobile = () => {
  const remote = useRemotePlayerDisplay();
  const { mpItem, mpAddByRSS } = useMediaPlayer();
  const live = useLiveMediaSnapshot();
  const showProgress = remote === null || remote.controls.showsProgress;

  if (remote === null && isPlayerResourceLive({ mpItem, mpAddByRSS }) && !live.display.canRewind) {
    return (
      <div className={styles.liveEdge}>
        <MediaPlayerProgress layoutVariant="edge" />
      </div>
    );
  }

  if (showProgress) {
    return <MediaPlayerProgress layoutVariant="edge" />;
  }

  return (
    <div className={styles.liveEdge}>
      <RemoteLiveLabel />
    </div>
  );
};
