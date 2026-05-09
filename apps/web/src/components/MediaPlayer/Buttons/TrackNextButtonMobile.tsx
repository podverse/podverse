import { FaForwardStep } from 'react-icons/fa6';

import { useAddByRSSListContext } from '../../../contexts/AddByRSSListContext';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useAddByRSSPlayNext } from '../../../hooks/useAddByRSSPlayNext';
import { useQueueResourcesMoveNowPlayingToHistory } from '../../../hooks/useQueueResourceMoveNowPlayingToHistory';
import { useQueueResourcesLoadActive } from '../../../hooks/useQueueResourcesLoadActive';
import { resolveAddByRSSListContextFromCurrentItem } from '../../../utils/addByRSS/resolveListContextFromCurrentItem';

import styles from '../../../styles/components/MediaPlayer/Buttons/TrackNextButtonMobile.module.scss';

export const TrackNextButtonMobile = () => {
  const {
    mpItem,
    mpClip,
    mpItemSoundbite,
    setMPShouldPlay,
    mpIsPlaying,
    mpAddByRSS,
    pendingMusicQueueLoadIntentRef,
  } = useMediaPlayer();
  const { listContext } = useAddByRSSListContext();
  const moveNowPlayingToHistory = useQueueResourcesMoveNowPlayingToHistory();
  const queueResourcesLoadActive = useQueueResourcesLoadActive();
  const addByRSSPlayNext = useAddByRSSPlayNext();

  const onClick = async () => {
    if (mpAddByRSS) {
      const hasListContext = listContext && listContext.itemIdTexts.length > 0;
      const fallbackContext = !hasListContext
        ? await resolveAddByRSSListContextFromCurrentItem(
            mpAddByRSS.idText,
            mpAddByRSS.resourceData,
            'recent'
          )
        : null;
      const played = await addByRSSPlayNext(fallbackContext ?? undefined);
      if (played) return;
      return;
    }
    await moveNowPlayingToHistory({
      mpClip: mpClip,
      mpItem: mpItem,
      mpItemSoundbite: mpItemSoundbite,
    });
    setMPShouldPlay(mpIsPlaying);
    pendingMusicQueueLoadIntentRef.current = 'fresh_transition';
    await queueResourcesLoadActive();
  };

  return (
    <button className={styles.trackNextButtonMobile} onClick={onClick} type="button">
      <FaForwardStep />
    </button>
  );
};
