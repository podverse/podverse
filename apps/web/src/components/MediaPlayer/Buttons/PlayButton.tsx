import { FaPause, FaPlay } from 'react-icons/fa6';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';

import styles from '../../../styles/components/MediaPlayer/Buttons/PlayButton.module.scss';

export const PlayButton = () => {
  const { mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const icon = mpIsPlaying ? <FaPause /> : <FaPlay />;

  const handleClick = () => {
    setMPIsPlaying(!mpIsPlaying);
  };

  return (
    <button className={styles.playButton} onClick={handleClick} type="button">
      {icon}
    </button>
  );
};
