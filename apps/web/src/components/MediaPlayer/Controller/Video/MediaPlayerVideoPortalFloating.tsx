'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { FaXmark } from 'react-icons/fa6';

import { cssClass } from '../../../../utils/cssModule';

import styles from '../../../../styles/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.module.scss';

type MediaPlayerVideoPortalFloatingProps = {
  children: React.ReactNode;
  onClose: () => void;
};

export const MediaPlayerVideoPortalFloating: React.FC<MediaPlayerVideoPortalFloatingProps> = ({
  children,
  onClose,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const tMisc = useTranslations('misc');

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return ReactDOM.createPortal(
    <div className={cssClass(styles, 'floatingVideoPortal')}>
      <button
        type="button"
        className={cssClass(styles, 'closeButton')}
        onClick={onClose}
        aria-label={tMisc('close_video_player')}
        title={tMisc('close_video_player')}
      >
        <FaXmark />
      </button>
      {children}
    </div>,
    document.body
  );
};
