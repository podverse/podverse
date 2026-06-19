'use client';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import { getSelectedLabeledItemEnclosureAndSource } from '@podverse/helpers';

import { useMediaPlayer } from '../../../../contexts/MediaPlayer';
import { useFloatingVideoPortalClick } from '../../../../hooks/useFloatingVideoPortalClick';
import { cssClass } from '../../../../utils/cssModule';

import styles from '../../../../styles/components/MediaPlayer/Controller/LiveStream/MediaPlayerLiveStreamVideoPortalFloating.module.scss';

export const MediaPlayerLivestreamVideoPortalFloating: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { mpItemLabeledItemEnclosures, mpEnclosureSelectedParams } = useMediaPlayer();
  const { handlePortalClick } = useFloatingVideoPortalClick();

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  const selectedItemEnclosureAndSource = getSelectedLabeledItemEnclosureAndSource({
    labeledItemEnclosures: mpItemLabeledItemEnclosures,
    type: mpEnclosureSelectedParams.type,
    enclosureRowIndex: mpEnclosureSelectedParams.enclosureRowSelected,
    sourceRowIndex: mpEnclosureSelectedParams.sourceRowSelected,
  });

  let style = {};
  const labeled = selectedItemEnclosureAndSource.labeledItemEnclosure;
  if (!labeled || labeled?.mediaType !== 'video') {
    style = { ...style, display: 'none' };
  }

  return ReactDOM.createPortal(
    <div
      className={cssClass(styles, 'floatingVideoPortal')}
      data-testid="floating-video-portal-livestream"
      style={style}
      onClick={handlePortalClick}
    >
      {children}
    </div>,
    document.body
  );
};
