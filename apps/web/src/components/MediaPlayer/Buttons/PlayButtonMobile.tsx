import { FaPause, FaPlay } from 'react-icons/fa6';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';

import styles from '../../../styles/components/MediaPlayer/Buttons/PlayButtonMobile.module.scss';

export const PlayButtonMobile = () => {
  const { mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const icon = mpIsPlaying ? <FaPause /> : <FaPlay />;

  const handleClick = () => {
    setMPIsPlaying(!mpIsPlaying);
  };

  return (
    <button className={styles.playButtonMobile} onClick={handleClick} type="button">
      {icon}
    </button>
  );
};
