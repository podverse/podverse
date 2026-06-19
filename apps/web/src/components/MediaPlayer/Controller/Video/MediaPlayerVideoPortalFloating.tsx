'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { FaXmark } from 'react-icons/fa6';

import { useFloatingVideoPortalClick } from '../../../../hooks/useFloatingVideoPortalClick';
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
  const { handlePortalClick } = useFloatingVideoPortalClick();

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      className={cssClass(styles, 'floatingVideoPortal')}
      data-testid="floating-video-portal"
      onClick={handlePortalClick}
    >
      <button
        type="button"
        className={cssClass(styles, 'closeButton')}
        data-floating-video-chrome
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
