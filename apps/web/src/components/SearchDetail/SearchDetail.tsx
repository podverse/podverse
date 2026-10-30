'use client';

import { useTranslations } from 'next-intl';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { FaRss } from 'react-icons/fa6';

import { Button, ImageLightboxModal, SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../constants/images';

import styles from '../../styles/components/SearchDetail/SearchDetail.module.scss';

export type SearchDetailPrimaryAction = {
  label: string;
  icon: ReactNode;
  isLoading: boolean;
  onClick: () => void;
};

export type SearchDetailProps = {
  /** Sentence under the header explaining what the action does. */
  explanation: string;
  primaryAction: SearchDetailPrimaryAction;
  /** The feed URL for the RSS Link button; null hides the button. */
  rssHref: string | null;
  /** Shown with role="status" under the buttons (timed out, queued, and similar). */
  statusMessage: string | null;
  /** Shown with role="alert" under the buttons. */
  errorMessage: string | null;
  imageUrls: string[];
  imageLightboxUrls: string[];
  imageAlt: string;
  title: string;
  author: string | null;
  /** Already formatted for display, e.g. "Updated Mar 1, 2026". */
  updatedLabel: string | null;
  description: string | null;
};

const hasDisplayText = (value: string | null): value is string => {
  return value !== null && value.trim() !== '';
};

export function SearchDetail({
  author,
  description,
  errorMessage,
  explanation,
  imageAlt,
  imageLightboxUrls,
  imageUrls,
  primaryAction,
  rssHref,
  statusMessage,
  title,
  updatedLabel,
}: SearchDetailProps): JSX.Element {
  const tFeatures = useTranslations('features');
  const tMisc = useTranslations('misc');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const showImage = imageUrls.length > 0;

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.explanation}>{explanation}</div>
        <div className={styles.buttonRow}>
          <Button
            variant="primary"
            onClick={primaryAction.onClick}
            className={styles.primaryActionButton}
            isLoading={primaryAction.isLoading}
          >
            <span className={styles.buttonIcon} aria-hidden="true">
              {primaryAction.icon}
            </span>
            {primaryAction.label}
          </Button>
          {hasDisplayText(rssHref) ? (
            <Button
              variant="secondary"
              href={rssHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.rssLinkButton}
            >
              <span className={styles.buttonIcon} aria-hidden="true">
                <FaRss />
              </span>
              {tFeatures('add_feed.rss_link')}
            </Button>
          ) : null}
        </div>
        {hasDisplayText(statusMessage) ? (
          <p className={styles.statusMessage} role="status">
            {statusMessage}
          </p>
        ) : null}
        {hasDisplayText(errorMessage) ? (
          <p className={styles.errorMessage} role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
      {showImage ? (
        <>
          <button
            aria-label={tMisc('image_preview_dialog')}
            className={styles.imageClickable}
            type="button"
            onClick={() => setLightboxOpen(true)}
          >
            <SkeletonFlashImage
              candidates={imageUrls}
              alt={imageAlt}
              width={IMAGES.ADD_FEED.SQUARE.SIZE}
              height={IMAGES.ADD_FEED.SQUARE.SIZE}
              className={styles.image}
            />
          </button>
          <ImageLightboxModal
            alt={imageAlt}
            ariaLabel={tMisc('image_preview_dialog')}
            candidates={imageLightboxUrls}
            closeButtonAriaLabel={tMisc('close_modal')}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
          />
        </>
      ) : null}
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.content}>
        {hasDisplayText(author) ? <div className={styles.author}>{author}</div> : null}
        {hasDisplayText(updatedLabel) ? (
          <span className={styles.lastUpdateTime}>{updatedLabel}</span>
        ) : null}
        {hasDisplayText(description) ? (
          <div className={styles.description}>{description}</div>
        ) : null}
      </div>
    </div>
  );
}
