'use client';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import { useMediaPlayer } from '../../../../contexts/MediaPlayer';
import styles from '../../../../styles/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.module.scss';
import { cssClass } from '../../../../utils/cssModule';

export const MediaPlayerVideoPortalFloating: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { mpItemSoundbite, mpClip, mpItemChapter } = useMediaPlayer();
  const hasMarquee = !!mpItemSoundbite || !!mpClip || !!mpItemChapter;

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      className={classNames({
        [cssClass(styles, 'floatingVideoPortal')]: true,
        [cssClass(styles, 'hasMarquee')]: hasMarquee,
      })}
    >
      {children}
    </div>,
    document.body
  );
};
