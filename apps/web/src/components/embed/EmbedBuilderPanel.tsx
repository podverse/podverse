'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { copyToClipboard } from '@podverse/helpers-browser';
import type { QueryParamsStatsRange } from '@podverse/helpers-requests';
import { QUERY_PARAMS_STATS_RANGE_VALUES } from '@podverse/helpers-requests';
import { Button, CheckboxField, FormStack, FormTextArea, TextInput } from '@podverse/ui';

import { WEB } from '../../constants/web';
import {
  buildEmbedBuilderUrlPath,
  embedBuilderQueryParamsToUrlInput,
} from '../../lib/embed/buildEmbedBuilderUrl';
import {
  buildEmbedIframeCode,
  EMBED_IFRAME_ALLOW,
  getEmbedIframeHeightForPlayerSize,
} from '../../lib/embed/buildEmbedIframeCode';
import { buildEmbedResizeListenerSnippet } from '../../lib/embed/buildEmbedResizeListenerSnippet';
import { resolveEmbedUrlTarget } from '../../lib/embed/buildEmbedUrl';
import { buildEmbedUrlEntityContextFromBuilderParams } from '../../lib/embed/buildEmbedUrlEntityContext';
import { buildEmbedUrlFromBuilderParams } from '../../lib/embed/buildEmbedUrlFromBuilderParams';
import { embedAspectRatioToCssValue } from '../../lib/embed/embedAspectRatio';
import type { EmbedBorderColorPresetKey } from '../../lib/embed/embedBorderColor';
import {
  EMBED_BORDER_COLOR_PRESET_KEYS,
  EMBED_BORDER_COLOR_PRESET_VALUES,
  resolveEmbedBorderPresetKey,
} from '../../lib/embed/embedBorderColor';
import type {
  EmbedBuilderListContentType,
  EmbedBuilderListSort,
  EmbedBuilderQueryParams,
  EmbedBuilderType,
} from '../../lib/embed/embedBuilderTypes';
import {
  EMBED_BUILDER_LIST_DEFAULT_SORT_BY_CONTENT,
  EMBED_BUILDER_LIST_SORT_OPTIONS_BY_CONTENT,
  EMBED_BUILDER_TYPES,
  resolveEmbedBuilderListContentOptions,
} from '../../lib/embed/embedBuilderTypes';
import type { EmbedPresentationQuery } from '../../lib/embed/embedTypes';
import { getEmbedPreviewIframeHeightClassKey } from '../../lib/embed/getEmbedPreviewIframeHeightClassKey';
import {
  EMBED_LIST_VISIBLE_ROWS_DEFAULT,
  EMBED_LIST_VISIBLE_ROWS_MAX,
  EMBED_LIST_VISIBLE_ROWS_MIN,
} from '../../lib/embed/parseEmbedListRows';
import {
  resolveDefaultMediaPreferenceForPlayerSize,
  resolveEmbedBuilderPresentation,
} from '../../lib/embed/resolveEmbedBuilderPresentation';

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

function parseListVisibleRowsInput(value: string): number {
  const trimmed = value.trim();
  if (trimmed === '') {
    return EMBED_LIST_VISIBLE_ROWS_DEFAULT;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) {
    return EMBED_LIST_VISIBLE_ROWS_DEFAULT;
  }

  return Math.min(Math.max(parsed, EMBED_LIST_VISIBLE_ROWS_MIN), EMBED_LIST_VISIBLE_ROWS_MAX);
}

type EmbedBuilderPanelProps = {
  initialParams: EmbedBuilderQueryParams;
};

export function EmbedBuilderPanel({ initialParams }: EmbedBuilderPanelProps) {
  const tFeatures = useTranslations('features');
  const router = useRouter();

  const [builderParams, setBuilderParams] = useState<EmbedBuilderQueryParams>(initialParams);
  const [startTimeInput, setStartTimeInput] = useState(String(initialParams.startSeconds));
  const [listVisibleRowsInput, setListVisibleRowsInput] = useState(
    String(initialParams.listVisibleRows)
  );
  const [isCopied, setIsCopied] = useState(false);
  const [isResizeSnippetCopied, setIsResizeSnippetCopied] = useState(false);
  const [borderMode, setBorderMode] = useState<'preset' | 'custom'>(
    resolveEmbedBorderPresetKey(initialParams.borderColor) !== null ? 'preset' : 'custom'
  );
  const [customBorderInput, setCustomBorderInput] = useState(
    resolveEmbedBorderPresetKey(initialParams.borderColor) === null ? initialParams.borderColor : ''
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeSnippetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (resizeSnippetTimeoutRef.current) {
        clearTimeout(resizeSnippetTimeoutRef.current);
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
    const { layout, playerSize } = resolveEmbedBuilderPresentation(type);
    const defaultMediaPreference = resolveDefaultMediaPreferenceForPlayerSize(playerSize);

    updateBuilderParams({
      type,
      mediaPreference: defaultMediaPreference,
      autoResize: layout === 'list' && playerSize === 'tall' ? builderParams.autoResize : false,
    });
  };

  const handleMediaPreferenceChange = (mediaPreference: EmbedPresentationQuery) => {
    updateBuilderParams({ mediaPreference });
  };

  const handleSelectBorderPreset = (key: EmbedBorderColorPresetKey) => {
    setBorderMode('preset');
    updateBuilderParams({ borderColor: EMBED_BORDER_COLOR_PRESET_VALUES[key] });
  };

  const handleSelectBorderCustom = () => {
    setBorderMode('custom');
    updateBuilderParams({ borderColor: customBorderInput });
  };

  const startSeconds = parseStartSecondsInput(startTimeInput);
  const listVisibleRows = parseListVisibleRowsInput(listVisibleRowsInput);

  const listContentOptions = resolveEmbedBuilderListContentOptions(builderParams);
  const normalizedListContentType: EmbedBuilderListContentType =
    listContentOptions.length > 0 && !listContentOptions.includes(builderParams.listContentType)
      ? (listContentOptions[0] ?? builderParams.listContentType)
      : builderParams.listContentType;
  const listSortOptions: readonly EmbedBuilderListSort[] =
    EMBED_BUILDER_LIST_SORT_OPTIONS_BY_CONTENT[normalizedListContentType];
  const normalizedListSort: EmbedBuilderListSort = listSortOptions.includes(builderParams.listSort)
    ? builderParams.listSort
    : (listSortOptions[0] ?? builderParams.listSort);
  const normalizedListRange =
    normalizedListSort === 'top' ? (builderParams.listRange ?? 'all-time') : null;

  const effectiveParams: EmbedBuilderQueryParams = {
    ...builderParams,
    startSeconds,
    listVisibleRows,
    listContentType: normalizedListContentType,
    listSort: normalizedListSort,
    listRange: normalizedListRange,
  };

  const { layout, playerSize } = resolveEmbedBuilderPresentation(effectiveParams.type);
  const isTallListType = effectiveParams.type === 'tall-list';
  const showListContentSelector = layout === 'list' && listContentOptions.length > 1;
  const showListSortSelector = layout === 'list' && listContentOptions.length > 0;
  const showListRangeSelector = showListSortSelector && effectiveParams.listSort === 'top';
  const autoResizeEnabled = isTallListType && effectiveParams.autoResize;
  const entityContext = buildEmbedUrlEntityContextFromBuilderParams(effectiveParams, layout);

  const embedTarget = useMemo(
    () => resolveEmbedUrlTarget(entityContext, layout, effectiveParams.listContentType),
    [entityContext, layout, effectiveParams.listContentType]
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
      height: getEmbedIframeHeightForPlayerSize(layout, playerSize, {
        listVisibleRows: effectiveParams.listVisibleRows,
        aspectRatio: effectiveParams.aspectRatio,
        includePresentationSelector: layout === 'list',
      }),
      layout,
      playerSize,
      presentation: effectiveParams.mediaPreference,
      aspectRatio: effectiveParams.aspectRatio,
      borderColor: effectiveParams.borderColor,
      includeResizeDataAttribute: autoResizeEnabled,
    });
  }, [
    autoResizeEnabled,
    effectiveParams.aspectRatio,
    effectiveParams.borderColor,
    effectiveParams.listVisibleRows,
    effectiveParams.mediaPreference,
    embedTarget,
    embedUrl,
    layout,
    playerSize,
    tFeatures,
  ]);

  const resizeListenerSnippet = useMemo(() => {
    if (!autoResizeEnabled) {
      return '';
    }

    return buildEmbedResizeListenerSnippet({ embedOrigin: WEB.origin });
  }, [autoResizeEnabled]);

  const previewIframeHeightClassKey = getEmbedPreviewIframeHeightClassKey(layout, playerSize);
  const isTallPlayerSize = playerSize === 'tall';
  const isTallSingle = effectiveParams.type === 'tall';
  const previewStyle = {
    ...(isTallSingle
      ? { '--embed-video-aspect-ratio': embedAspectRatioToCssValue(effectiveParams.aspectRatio) }
      : {}),
    ...(layout === 'list'
      ? { '--embed-list-visible-rows': String(effectiveParams.listVisibleRows) }
      : {}),
    ...(layout === 'list' ? { '--embed-has-presentation-selector': 1 } : {}),
  } as CSSProperties;

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

  const handleCopyResizeSnippet = () => {
    if (resizeListenerSnippet === '') {
      return;
    }

    copyToClipboard(resizeListenerSnippet);
    setIsResizeSnippetCopied(true);

    if (resizeSnippetTimeoutRef.current) {
      clearTimeout(resizeSnippetTimeoutRef.current);
    }

    resizeSnippetTimeoutRef.current = setTimeout(() => {
      setIsResizeSnippetCopied(false);
    }, 2000);
  };

  const typeLabels: Record<EmbedBuilderType, string> = {
    short: tFeatures('embed_type_short'),
    tall: tFeatures('embed_type_tall'),
    'short-list': tFeatures('embed_type_short_list'),
    'tall-list': tFeatures('embed_type_tall_list'),
  };

  const listContentLabels: Record<EmbedBuilderListContentType, string> = {
    episodes: tFeatures('embed_list_content_episodes'),
    clips: tFeatures('embed_list_content_clips'),
    tracks: tFeatures('embed_list_content_tracks'),
    chapters: tFeatures('embed_list_content_chapters'),
  };

  const listSortLabels: Record<EmbedBuilderListSort, string> = {
    recent: tFeatures('embed_list_sort_recent'),
    oldest: tFeatures('embed_list_sort_oldest'),
    top: tFeatures('embed_list_sort_popularity'),
    forward: tFeatures('embed_list_sort_forward'),
    backward: tFeatures('embed_list_sort_backward'),
    asc: tFeatures('embed_list_sort_asc'),
    desc: tFeatures('embed_list_sort_desc'),
  };

  const listRangeLabels: Record<QueryParamsStatsRange, string> = {
    day: tFeatures('embed_list_range_day'),
    week: tFeatures('embed_list_range_week'),
    month: tFeatures('embed_list_range_month'),
    'all-time': tFeatures('embed_list_range_all_time'),
  };

  const handleListContentTypeChange = (listContentType: EmbedBuilderListContentType) => {
    const defaultSort = EMBED_BUILDER_LIST_DEFAULT_SORT_BY_CONTENT[listContentType];
    updateBuilderParams({
      listContentType,
      listSort: defaultSort,
      listRange: defaultSort === 'top' ? 'all-time' : null,
    });
  };

  const handleListSortChange = (listSort: EmbedBuilderListSort) => {
    updateBuilderParams({
      listSort,
      listRange: listSort === 'top' ? 'all-time' : null,
    });
  };

  const handleListRangeChange = (listRange: QueryParamsStatsRange) => {
    updateBuilderParams({ listRange });
  };

  const borderColorLabels: Record<EmbedBorderColorPresetKey, string> = {
    black: tFeatures('embed_border_color_black'),
    'darker-gray': tFeatures('embed_border_color_darker_gray'),
    'lighter-gray': tFeatures('embed_border_color_lighter_gray'),
    white: tFeatures('embed_border_color_white'),
    none: tFeatures('embed_border_color_none'),
  };

  const selectedBorderPresetKey = resolveEmbedBorderPresetKey(effectiveParams.borderColor);

  return (
    <div className={styles.root} data-testid="embed-builder-page">
      <h1 className={styles.pageTitle}>{tFeatures('embed_builder')}</h1>

      <div
        className={
          isTallSingle ? `${styles.previewFrame} ${styles.previewFrameTall}` : styles.previewFrame
        }
        data-testid="embed-builder-preview"
        style={previewStyle}
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

      <div className={styles.typeSelector} data-testid="embed-builder-prefer-selector">
        <span>{tFeatures('embed_prefer_label')}</span>
        <div
          className={styles.typeOptions}
          role="radiogroup"
          aria-label={tFeatures('embed_prefer_label')}
        >
          <label className={styles.typeOption}>
            <input
              checked={effectiveParams.mediaPreference === 'audio'}
              name="embed_builder_prefer"
              onChange={() => handleMediaPreferenceChange('audio')}
              type="radio"
              value="audio"
            />
            <span>{tFeatures('embed_prefer_audio')}</span>
          </label>
          <label className={styles.typeOption}>
            <input
              checked={effectiveParams.mediaPreference === 'video'}
              name="embed_builder_prefer"
              onChange={() => handleMediaPreferenceChange('video')}
              type="radio"
              value="video"
            />
            <span>{tFeatures('embed_prefer_video')}</span>
          </label>
        </div>
      </div>

      {isTallPlayerSize ? (
        <div className={styles.typeSelector} data-testid="embed-builder-aspect-ratio-selector">
          <span>{tFeatures('embed_aspect_ratio_label')}</span>
          <div
            className={styles.typeOptions}
            role="radiogroup"
            aria-label={tFeatures('embed_aspect_ratio_label')}
          >
            <label className={styles.typeOption}>
              <input
                checked={effectiveParams.aspectRatio === '16x9'}
                name="embed_builder_aspect_ratio"
                onChange={() => updateBuilderParams({ aspectRatio: '16x9' })}
                type="radio"
                value="16x9"
              />
              <span>{tFeatures('embed_aspect_ratio_16_9')}</span>
            </label>
            <label className={styles.typeOption}>
              <input
                checked={effectiveParams.aspectRatio === '4x3'}
                name="embed_builder_aspect_ratio"
                onChange={() => updateBuilderParams({ aspectRatio: '4x3' })}
                type="radio"
                value="4x3"
              />
              <span>{tFeatures('embed_aspect_ratio_4_3')}</span>
            </label>
            <label className={styles.typeOption}>
              <input
                checked={effectiveParams.aspectRatio === '1x1'}
                name="embed_builder_aspect_ratio"
                onChange={() => updateBuilderParams({ aspectRatio: '1x1' })}
                type="radio"
                value="1x1"
              />
              <span>{tFeatures('embed_aspect_ratio_1_1')}</span>
            </label>
          </div>
        </div>
      ) : null}

      <div className={styles.typeSelector} data-testid="embed-builder-border-color-selector">
        <span>{tFeatures('embed_border_color_label')}</span>
        <div
          className={styles.typeOptions}
          role="radiogroup"
          aria-label={tFeatures('embed_border_color_label')}
        >
          {EMBED_BORDER_COLOR_PRESET_KEYS.map((key) => (
            <label key={key} className={styles.typeOption}>
              <input
                checked={borderMode === 'preset' && selectedBorderPresetKey === key}
                name="embed_builder_border_color"
                onChange={() => handleSelectBorderPreset(key)}
                type="radio"
                value={key}
              />
              <span>{borderColorLabels[key]}</span>
            </label>
          ))}
          <label className={styles.typeOption}>
            <input
              checked={borderMode === 'custom'}
              name="embed_builder_border_color"
              onChange={handleSelectBorderCustom}
              type="radio"
              value="custom"
            />
            <span>{tFeatures('embed_border_color_custom')}</span>
          </label>
        </div>
        {borderMode === 'custom' ? (
          <div data-testid="embed-builder-border-color-custom">
            <TextInput
              type="text"
              name="embed_border_color_custom"
              value={customBorderInput}
              eyebrow={tFeatures('embed_border_color_custom_label')}
              onChange={(event) => {
                setCustomBorderInput(event.target.value);
                updateBuilderParams({ borderColor: event.target.value });
              }}
            />
          </div>
        ) : null}
      </div>

      {showListContentSelector ? (
        <div className={styles.typeSelector} data-testid="embed-builder-list-content-selector">
          <span>{tFeatures('embed_list_content_label')}</span>
          <div
            className={styles.typeOptions}
            role="radiogroup"
            aria-label={tFeatures('embed_list_content_label')}
          >
            {listContentOptions.map((listContentType) => (
              <label key={listContentType} className={styles.typeOption}>
                <input
                  checked={effectiveParams.listContentType === listContentType}
                  name="embed_builder_list_content"
                  onChange={() => handleListContentTypeChange(listContentType)}
                  type="radio"
                  value={listContentType}
                />
                <span>{listContentLabels[listContentType]}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {showListSortSelector ? (
        <div className={styles.typeSelector} data-testid="embed-builder-list-sort-selector">
          <span>{tFeatures('embed_list_sort_label')}</span>
          <div
            className={styles.typeOptions}
            role="radiogroup"
            aria-label={tFeatures('embed_list_sort_label')}
          >
            {listSortOptions.map((listSort: EmbedBuilderListSort) => (
              <label key={listSort} className={styles.typeOption}>
                <input
                  checked={effectiveParams.listSort === listSort}
                  name="embed_builder_list_sort"
                  onChange={() => handleListSortChange(listSort)}
                  type="radio"
                  value={listSort}
                />
                <span>{listSortLabels[listSort]}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {showListRangeSelector ? (
        <div className={styles.typeSelector} data-testid="embed-builder-list-range-selector">
          <span>{tFeatures('embed_list_range_label')}</span>
          <div
            className={styles.typeOptions}
            role="radiogroup"
            aria-label={tFeatures('embed_list_range_label')}
          >
            {QUERY_PARAMS_STATS_RANGE_VALUES.map((listRange) => (
              <label key={listRange} className={styles.typeOption}>
                <input
                  checked={(effectiveParams.listRange ?? 'all-time') === listRange}
                  name="embed_builder_list_range"
                  onChange={() => handleListRangeChange(listRange)}
                  type="radio"
                  value={listRange}
                />
                <span>{listRangeLabels[listRange]}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.controls}>
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
        {layout === 'list' ? (
          <div data-testid="embed-builder-list-visible-rows">
            <TextInput
              type="number"
              name="embed_list_visible_rows"
              min={EMBED_LIST_VISIBLE_ROWS_MIN}
              max={EMBED_LIST_VISIBLE_ROWS_MAX}
              step={1}
              value={listVisibleRowsInput}
              eyebrow={tFeatures('embed_list_items_visible')}
              onChange={(event) => {
                setListVisibleRowsInput(event.target.value);
                const parsed = parseListVisibleRowsInput(event.target.value);
                updateBuilderParams({ listVisibleRows: parsed });
              }}
            />
          </div>
        ) : null}
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
          {isTallListType ? (
            <CheckboxField
              label={tFeatures('embed_auto_resize_toggle')}
              checked={effectiveParams.autoResize}
              onChange={(checked) => updateBuilderParams({ autoResize: checked })}
            />
          ) : null}
          {autoResizeEnabled ? (
            <>
              <p className={styles.placeholder}>{tFeatures('embed_auto_resize_warning')}</p>
              <div className={styles.resizeSnippetBlock}>
                <FormTextArea
                  eyebrow={tFeatures('embed_auto_resize_listener_snippet')}
                  name="embed_resize_listener_snippet"
                  value={resizeListenerSnippet}
                  readOnly
                  rows={8}
                />
                <Button onClick={handleCopyResizeSnippet} type="button" variant="secondary">
                  {isResizeSnippetCopied ? tFeatures('copied') : tFeatures('copy')}
                </Button>
              </div>
            </>
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
