import { FaForwardStep } from 'react-icons/fa6';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useAddByRSSListContext } from '../../../contexts/AddByRSSListContext';
import { useAddByRSSPlayNext } from '../../../hooks/useAddByRSSPlayNext';
import { useQueueResourcesLoadActive } from '../../../hooks/useQueueResourcesLoadActive';
import { useQueueResourcesMoveNowPlayingToHistory } from '../../../hooks/useQueueResourceMoveNowPlayingToHistory';
import { resolveAddByRSSListContextFromCurrentItem } from '../../../utils/addByRSS/resolveListContextFromCurrentItem';
import styles from '../../../styles/components/MediaPlayer/Buttons/TrackNextButtonMobile.module.scss';

export const TrackNextButtonMobile = () => {
  const { mpItem, mpClip, mpItemSoundbite, setMPShouldPlay, mpIsPlaying, mpAddByRSS } =
    useMediaPlayer();
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
    await queueResourcesLoadActive();
  };

  return (
    <button className={styles.trackNextButtonMobile} onClick={onClick} type="button">
      <FaForwardStep />
    </button>
  );
};
