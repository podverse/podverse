'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

import { getSelectedLabeledItemEnclosureAndSource } from '@podverse/helpers';

import { useMediaPlayer } from '../../../../contexts/MediaPlayer';
import { useFloatingVideoPortalClick } from '../../../../hooks/useFloatingVideoPortalClick';
import { useFloatingVideoTransform } from '../../../../hooks/useFloatingVideoTransform';
import { cssClass } from '../../../../utils/cssModule';

import styles from '../../../../styles/components/MediaPlayer/Controller/LiveStream/MediaPlayerLiveStreamVideoPortalFloating.module.scss';

export const MediaPlayerLivestreamVideoPortalFloating: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mounted, setMounted] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);

  const { mpItemLabeledItemEnclosures, mpEnclosureSelectedParams } = useMediaPlayer();
  const {
    containerStyle,
    dragHandleProps,
    resizeHandleProps,
    isDragging,
    isResizing,
    resizeEnabled,
    consumeClickAfterDrag,
  } = useFloatingVideoTransform(portalRef);
  const { handlePortalClick } = useFloatingVideoPortalClick({ consumeClickAfterDrag });

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
      ref={portalRef}
      className={`${cssClass(styles, 'floatingVideoPortal')}${isDragging ? ` ${cssClass(styles, 'isDragging')}` : ''}${isResizing ? ` ${cssClass(styles, 'isResizing')}` : ''}`}
      data-testid="floating-video-portal-livestream"
      style={{ ...style, ...containerStyle }}
      onClick={handlePortalClick}
      {...dragHandleProps}
    >
      {resizeEnabled && (
        <div
          className={cssClass(styles, 'resizeHandle')}
          data-floating-video-ignore-drag
          data-testid="floating-video-resize-handle"
          {...resizeHandleProps}
          aria-hidden="true"
        />
      )}
      {children}
    </div>,
    document.body
  );
};
