'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { copyToClipboard } from '@podverse/helpers-browser';
import { CheckboxField, FormStack, TextInput } from '@podverse/ui';

import {
  buildEmbedBuilderUrlPath,
  embedBuilderQueryParamsToUrlInput,
} from '../../lib/embed/buildEmbedBuilderUrl';
import {
  buildEmbedIframeCode,
  EMBED_IFRAME_ALLOW,
  getEmbedIframeHeightForPresentation,
} from '../../lib/embed/buildEmbedIframeCode';
import { resolveEmbedUrlTarget } from '../../lib/embed/buildEmbedUrl';
import { buildEmbedUrlEntityContextFromBuilderParams } from '../../lib/embed/buildEmbedUrlEntityContext';
import { buildEmbedUrlFromBuilderParams } from '../../lib/embed/buildEmbedUrlFromBuilderParams';
import type { EmbedBuilderQueryParams, EmbedBuilderType } from '../../lib/embed/embedBuilderTypes';
import { EMBED_BUILDER_TYPES } from '../../lib/embed/embedBuilderTypes';
import { getEmbedPreviewIframeHeightClassKey } from '../../lib/embed/getEmbedPreviewIframeHeightClassKey';
import { resolveEmbedBuilderPresentation } from '../../lib/embed/resolveEmbedBuilderPresentation';

import styles from './EmbedBuilderPanel.module.scss';

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

type EmbedBuilderPanelProps = {
  initialParams: EmbedBuilderQueryParams;
};

export function EmbedBuilderPanel({ initialParams }: EmbedBuilderPanelProps) {
  const tFeatures = useTranslations('features');
  const router = useRouter();

  const [builderParams, setBuilderParams] = useState<EmbedBuilderQueryParams>(initialParams);
  const [startTimeInput, setStartTimeInput] = useState(String(initialParams.startSeconds));
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const syncUrl = useCallback(
    (nextParams: EmbedBuilderQueryParams) => {
      const nextPath = buildEmbedBuilderUrlPath(embedBuilderQueryParamsToUrlInput(nextParams));
      router.replace(nextPath);
    },
    [router]
  );

  const updateBuilderParams = useCallback(
    (patch: Partial<EmbedBuilderQueryParams>) => {
      setBuilderParams((current) => {
        const next = { ...current, ...patch };
        syncUrl(next);
        return next;
      });
    },
    [syncUrl]
  );

  const handleTypeChange = (type: EmbedBuilderType) => {
    const { layout } = resolveEmbedBuilderPresentation(type);
    const autoplayDefault = layout === 'list';
    updateBuilderParams({
      type,
      autoplay: autoplayDefault,
    });
  };

  const startSeconds = parseStartSecondsInput(startTimeInput);
  const effectiveParams: EmbedBuilderQueryParams = {
    ...builderParams,
    startSeconds,
  };

  const { layout, presentation } = resolveEmbedBuilderPresentation(effectiveParams.type);
  const entityContext = buildEmbedUrlEntityContextFromBuilderParams(effectiveParams, layout);

  const embedTarget = useMemo(
    () => resolveEmbedUrlTarget(entityContext, layout),
    [entityContext, layout]
  );

  const embedUrl = useMemo(
    () => buildEmbedUrlFromBuilderParams(effectiveParams),
    [effectiveParams]
  );

  const embedCode = useMemo(() => {
    if (embedUrl === null || embedTarget === null) {
      return '';
    }

    return buildEmbedIframeCode(embedUrl, {
      title: tFeatures('embed'),
      height: getEmbedIframeHeightForPresentation(layout, presentation),
    });
  }, [embedTarget, embedUrl, layout, presentation, tFeatures]);

  const previewIframeHeightClassKey = getEmbedPreviewIframeHeightClassKey(layout, presentation);
  const isVideoSingle = effectiveParams.type === 'video';

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

  const typeLabels: Record<EmbedBuilderType, string> = {
    audio: tFeatures('embed_type_audio'),
    video: tFeatures('embed_type_video'),
    'audio-list': tFeatures('embed_type_audio_list'),
    'video-list': tFeatures('embed_type_video_list'),
  };

  return (
    <div className={styles.root} data-testid="embed-builder-page">
      <h1 className={styles.pageTitle}>{tFeatures('embed_builder')}</h1>

      <div
        className={
          isVideoSingle ? `${styles.previewFrame} ${styles.previewFrameVideo}` : styles.previewFrame
        }
        data-testid="embed-builder-preview"
      >
        {embedUrl !== null ? (
          <iframe
            className={`${styles.previewIframe} ${styles[previewIframeHeightClassKey]}`}
            src={embedUrl}
            title={tFeatures('embed_preview')}
            allow={EMBED_IFRAME_ALLOW}
          />
        ) : null}
      </div>

      <div className={styles.typeSelector} data-testid="embed-builder-type-selector">
        <span>{tFeatures('embed_type_label')}</span>
        <div
          className={styles.typeOptions}
          role="radiogroup"
          aria-label={tFeatures('embed_type_label')}
        >
          {EMBED_BUILDER_TYPES.map((type) => (
            <label key={type} className={styles.typeOption}>
              <input
                checked={effectiveParams.type === type}
                name="embed_builder_type"
                onChange={() => handleTypeChange(type)}
                type="radio"
                value={type}
              />
              <span>{typeLabels[type]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.controls}>
        <div data-testid="embed-builder-autoplay">
          <CheckboxField
            label={tFeatures('embed_autoplay')}
            checked={effectiveParams.autoplay}
            onChange={(checked) => updateBuilderParams({ autoplay: checked })}
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
            onChange={(event) => {
              setStartTimeInput(event.target.value);
              const parsed = parseStartSecondsInput(event.target.value);
              updateBuilderParams({ startSeconds: parsed });
            }}
          />
        </div>
      </div>

      <details className={styles.advanced}>
        <summary className={styles.advancedSummary}>{tFeatures('embed_advanced')}</summary>
        <div className={styles.advanced}>
          {layout === 'list' ? (
            <TextInput
              type="text"
              name="embed_play_id_text"
              value={effectiveParams.playIdText ?? ''}
              eyebrow={tFeatures('embed_play_id_text')}
              onChange={(event) =>
                updateBuilderParams({
                  playIdText: event.target.value.trim() === '' ? null : event.target.value.trim(),
                })
              }
            />
          ) : null}
          <p className={styles.placeholder}>{tFeatures('embed_color_customization_coming_soon')}</p>
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
  );
}
