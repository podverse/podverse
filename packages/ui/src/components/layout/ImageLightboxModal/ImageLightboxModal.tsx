'use client';

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
