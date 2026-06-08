'use client';

import { useTranslations } from 'next-intl';
import React, { useMemo, useRef, useState } from 'react';

import { copyToClipboard } from '@podverse/helpers-browser';
import { CheckboxField, FormStack, Modal, TextInput } from '@podverse/ui';

import { defaultModalEmbedBuilder, useModals } from '../../contexts/Modals';
import type { EmbedUrlLayoutPreference } from '../../lib/embed';
import {
  buildEmbedIframeCode,
  buildEmbedUrl,
  DEFAULT_SINGLE_IFRAME_HEIGHT,
  EMBED_IFRAME_ALLOW,
  getEmbedIframeHeightForRouteKind,
  resolveEmbedUrlTarget,
} from '../../lib/embed';

import styles from './ModalEmbedBuilder.module.scss';

function parseStartSecondsInput(value: string): number {
  const trimmed = value.trim();
  if (trimmed === '') {
    return 0;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export const ModalEmbedBuilder: React.FC = () => {
  const tFeatures = useTranslations('features');
  const tMisc = useTranslations('misc');
  const { modalEmbedBuilder, setModalEmbedBuilder } = useModals();

  const [autoplay, setAutoplay] = useState(false);
  const [startTimeInput, setStartTimeInput] = useState('0');
  const [playIdText, setPlayIdText] = useState('');
  const [listLayout, setListLayout] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const isOpen =
    modalEmbedBuilder.channel !== null ||
    modalEmbedBuilder.item !== null ||
    modalEmbedBuilder.clip !== null ||
    modalEmbedBuilder.item_chapter !== null ||
    modalEmbedBuilder.item_soundbite !== null ||
    modalEmbedBuilder.playlist !== null;

  const canToggleListLayout =
    modalEmbedBuilder.channel !== null &&
    modalEmbedBuilder.item !== null &&
    modalEmbedBuilder.clip === null &&
    modalEmbedBuilder.item_chapter === null &&
    modalEmbedBuilder.item_soundbite === null &&
    modalEmbedBuilder.playlist === null;

  const layoutPreference: EmbedUrlLayoutPreference = listLayout ? 'list' : 'auto';

  const embedTarget = useMemo(
    () => resolveEmbedUrlTarget(modalEmbedBuilder, layoutPreference),
    [layoutPreference, modalEmbedBuilder]
  );

  const startSeconds = parseStartSecondsInput(startTimeInput);

  const embedUrl = useMemo(
    () =>
      buildEmbedUrl(modalEmbedBuilder, {
        layout: layoutPreference,
        autoplay,
        startSeconds,
        playIdText: playIdText.trim() === '' ? null : playIdText.trim(),
      }),
    [autoplay, layoutPreference, modalEmbedBuilder, playIdText, startSeconds]
  );

  const embedCode = useMemo(() => {
    if (embedUrl === null || embedTarget === null) {
      return '';
    }

    return buildEmbedIframeCode(embedUrl, {
      title: tFeatures('embed'),
      height: getEmbedIframeHeightForRouteKind(embedTarget.routeKind),
    });
  }, [embedTarget, embedUrl, tFeatures]);

  const previewHeight =
    embedTarget === null
      ? DEFAULT_SINGLE_IFRAME_HEIGHT
      : getEmbedIframeHeightForRouteKind(embedTarget.routeKind);

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    setModalEmbedBuilder(defaultModalEmbedBuilder);
    setAutoplay(false);
    setStartTimeInput('0');
    setPlayIdText('');
    setListLayout(false);
    setIsCopied(false);
  };

  const handleCopy = () => {
    if (embedCode === '') {
      return;
    }

    copyToClipboard(embedCode);
    setIsCopied(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <Modal
      header={tFeatures('embed_builder')}
      isOpen={isOpen}
      onClose={handleClose}
      closeButtonAriaLabel={tMisc('close_modal')}
      ariaLabel={tFeatures('embed_builder')}
      modalContentMaxWidth={720}
    >
      <div className={styles.root} data-testid="embed-builder-modal">
        <div className={styles.previewFrame} data-testid="embed-builder-preview">
          {embedUrl !== null ? (
            <iframe
              className={styles.previewIframe}
              src={embedUrl}
              title={tFeatures('embed_preview')}
              height={previewHeight}
              allow={EMBED_IFRAME_ALLOW}
            />
          ) : null}
        </div>

        <div className={styles.controls}>
          <div data-testid="embed-builder-autoplay">
            <CheckboxField
              label={tFeatures('embed_autoplay')}
              checked={autoplay}
              onChange={setAutoplay}
            />
          </div>

          <div data-testid="embed-builder-start-time">
            <TextInput
              type="number"
              name="embed_start_time"
              min={0}
              step={1}
              value={startTimeInput}
              eyebrow={tFeatures('embed_start_time_seconds')}
              onChange={(event) => setStartTimeInput(event.target.value)}
            />
          </div>
        </div>

        <details className={styles.advanced}>
          <summary className={styles.advancedSummary}>{tFeatures('embed_advanced')}</summary>
          <div className={styles.advanced}>
            {canToggleListLayout ? (
              <CheckboxField
                label={tFeatures('embed_list_layout')}
                checked={listLayout}
                onChange={setListLayout}
              />
            ) : null}
            {embedTarget?.isListRoute ? (
              <TextInput
                type="text"
                name="embed_play_id_text"
                value={playIdText}
                eyebrow={tFeatures('embed_play_id_text')}
                onChange={(event) => setPlayIdText(event.target.value)}
              />
            ) : null}
            <p className={styles.placeholder}>
              {tFeatures('embed_color_customization_coming_soon')}
            </p>
          </div>
        </details>

        <FormStack>
          <div data-testid="embed-builder-code">
            <TextInput
              type="text"
              name="embed_code"
              value={embedCode}
              eyebrow={tFeatures('embed_code')}
              button={{
                label: isCopied ? tFeatures('copied') : tFeatures('copy'),
                onClick: handleCopy,
              }}
              readOnly
            />
          </div>
        </FormStack>
      </div>
    </Modal>
  );
};
