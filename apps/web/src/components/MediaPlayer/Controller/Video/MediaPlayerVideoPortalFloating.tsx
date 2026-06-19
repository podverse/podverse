'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { FaXmark } from 'react-icons/fa6';

import { useFloatingVideoPortalClick } from '../../../../hooks/useFloatingVideoPortalClick';
import { useFloatingVideoTransform } from '../../../../hooks/useFloatingVideoTransform';
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
  const portalRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);

  const tMisc = useTranslations('misc');
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

  return ReactDOM.createPortal(
    <div
      ref={portalRef}
      className={`${cssClass(styles, 'floatingVideoPortal')}${isDragging ? ` ${cssClass(styles, 'isDragging')}` : ''}${isResizing ? ` ${cssClass(styles, 'isResizing')}` : ''}`}
      data-testid="floating-video-portal"
      style={containerStyle}
      onClick={handlePortalClick}
      {...dragHandleProps}
    >
      <button
        type="button"
        className={cssClass(styles, 'closeButton')}
        data-floating-video-chrome
        data-floating-video-ignore-drag
        onClick={onClose}
        aria-label={tMisc('close_video_player')}
        title={tMisc('close_video_player')}
      >
        <FaXmark />
      </button>
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
