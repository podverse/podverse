'use client';

import { useEffect } from 'react';

import { SkeletonFlashImage } from '../../image/SkeletonFlashImage/SkeletonFlashImage';
import { Modal } from '../Modal/Modal';

import styles from './ImageLightboxModal.module.scss';

/** Intrinsic Next/Image dimensions for lightbox (CSS constrains to viewport). */
export const IMAGE_LIGHTBOX_DISPLAY_DIMENSION = 1920;

export type ImageLightboxModalProps = {
  alt: string;
  ariaLabel: string;
  candidates: string[];
  closeButtonAriaLabel: string;
  isOpen: boolean;
  onClose: () => void;
};

export function ImageLightboxModal({
  alt,
  ariaLabel,
  candidates,
  closeButtonAriaLabel,
  isOpen,
  onClose,
}: ImageLightboxModalProps) {
  // #region agent log
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const first = candidates[0] ?? null;
    fetch('http://127.0.0.1:7492/ingest/b00b7ad8-3302-43b6-ba18-0bcb911f8469', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd08547' },
      body: JSON.stringify({
        sessionId: 'd08547',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'ImageLightboxModal.tsx:open',
        message: 'lightbox_modal_candidates',
        data: {
          count: candidates.length,
          firstHost:
            first !== null
              ? (() => {
                  try {
                    return new URL(first).host;
                  } catch {
                    return 'parse_error';
                  }
                })()
              : null,
          firstPathSuffix: first !== null && first.length > 0 ? first.slice(-48) : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [isOpen, candidates]);
  // #endregion

  return (
    <Modal
      ariaLabel={ariaLabel}
      closeButtonAriaLabel={closeButtonAriaLabel}
      contentOverflowHidden
      contentTransparent
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className={styles.viewport}>
        <SkeletonFlashImage
          alt={alt}
          candidates={candidates}
          className={styles.image}
          height={IMAGE_LIGHTBOX_DISPLAY_DIMENSION}
          width={IMAGE_LIGHTBOX_DISPLAY_DIMENSION}
        />
      </div>
    </Modal>
  );
}
