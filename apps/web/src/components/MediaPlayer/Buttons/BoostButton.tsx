'use client';

import { useTranslations } from 'next-intl';
import { FaCommentDollar } from 'react-icons/fa6';

import { useModals } from '../../../contexts/Modals';
import { usePlayerBoostTarget } from './usePlayerBoostTarget';

import styles from '../../../styles/components/MediaPlayer/Buttons/BoostButton.module.scss';

export const BoostButton = () => {
  const target = usePlayerBoostTarget();
  const { setModalBoost } = useModals();
  const tValue = useTranslations('value');

  if (target === null) {
    return null;
  }

  const { channel, item } = target;

  return (
    <button
      className={styles.boostButton}
      aria-label={tValue('boost')}
      data-testid="media-player-boost-button"
      onClick={() => {
        setModalBoost({ channel, item });
      }}
      type="button"
    >
      <FaCommentDollar aria-hidden />
    </button>
  );
};
