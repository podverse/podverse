'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useState } from 'react';
import { FaCircleQuestion } from 'react-icons/fa6';

import type { QueryParamsStatsRange } from '@podverse/helpers-requests';
import { QUERY_PARAMS_STATS_RANGE_VALUES } from '@podverse/helpers-requests';
import {
  Accordion,
  CodeBlock,
  CompactNumericInput,
  CompactTextInput,
  FormInset,
  FormStack,
  PopoverIcon,
  RadioButton,
  TextInput,
} from '@podverse/ui';

import { useConfig } from '../../contexts/Config';
import { buildEmbedBuilderPreviewFrameStyle } from '../../lib/embed/buildEmbedBuilderPreviewFrameStyle';
import {
  buildEmbedBuilderUrlPath,
  embedBuilderQueryParamsToUrlInput,
} from '../../lib/embed/buildEmbedBuilderUrl';
import {
  buildEmbedIframeCode,
  EMBED_IFRAME_ALLOW,
  getEmbedIframeHeightForPlayerSize,
} from '../../lib/embed/buildEmbedIframeCode';
import { resolveEmbedUrlTarget } from '../../lib/embed/buildEmbedUrl';
import { buildEmbedUrlEntityContextFromBuilderParams } from '../../lib/embed/buildEmbedUrlEntityContext';
import { buildEmbedUrlFromBuilderParams } from '../../lib/embed/buildEmbedUrlFromBuilderParams';
import type { EmbedBorderColorPresetKey } from '../../lib/embed/embedBorderColor';
import {
  EMBED_BORDER_COLOR_PRESET_KEYS,
  EMBED_BORDER_COLOR_PRESET_VALUES,
  resolveEmbedBorderPresetKey,
} from '../../lib/embed/embedBorderColor';
import type {
  EmbedBuilderListContentType,
  EmbedBuilderListSort,
  EmbedBuilderPlayerSize,
  EmbedBuilderQueryParams,
} from '../../lib/embed/embedBuilderTypes';
import {
  EMBED_BUILDER_LIST_DEFAULT_SORT_BY_CONTENT,
  EMBED_BUILDER_LIST_SORT_OPTIONS_BY_CONTENT,
  EMBED_BUILDER_PLAYER_SIZES,
  normalizeEmbedBuilderParamsForSource,
  resolveEmbedBuilderListAvailability,
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

function isEmbedBuilderPlayerSize(value: string): value is EmbedBuilderPlayerSize {
  return EMBED_BUILDER_PLAYER_SIZES.some((playerSize) => playerSize === value);
}

function isEmbedBuilderListToggleValue(value: string): value is 'on' | 'off' {
  return value === 'on' || value === 'off';
}

function isEmbedPresentationQuery(value: string): value is EmbedPresentationQuery {
  return value === 'audio' || value === 'video';
}

function isEmbedBorderColorPresetKey(value: string): value is EmbedBorderColorPresetKey {
  return EMBED_BORDER_COLOR_PRESET_KEYS.some((key) => key === value);
}

function isEmbedBuilderListContentType(
  value: string,
  allowed: readonly EmbedBuilderListContentType[]
): value is EmbedBuilderListContentType {
  return allowed.some((option) => option === value);
}

function isEmbedBuilderListSort(
  value: string,
  allowed: readonly EmbedBuilderListSort[]
): value is EmbedBuilderListSort {
  return allowed.some((option) => option === value);
}

function isQueryParamsStatsRange(value: string): value is QueryParamsStatsRange {
  return QUERY_PARAMS_STATS_RANGE_VALUES.some((option) => option === value);
}

type EmbedBuilderPanelProps = {
  initialParams: EmbedBuilderQueryParams;
};

export function EmbedBuilderPanel({ initialParams }: EmbedBuilderPanelProps) {
  const tFeatures = useTranslations('features');
  const tMisc = useTranslations('misc');
  const config = useConfig();
  const router = useRouter();
  const embedIframeTitle = tFeatures('embed_iframe_title', {
    brand_name: config.public.brand.name,
  });
  const fieldHelpAriaLabel = tMisc('more_info');

  const [builderParams, setBuilderParams] = useState<EmbedBuilderQueryParams>(initialParams);
  const [startTimeInput, setStartTimeInput] = useState(String(initialParams.startSeconds));
  const [listVisibleRowsInput, setListVisibleRowsInput] = useState(
    String(initialParams.listVisibleRows)
  );
  const [playIdTextInput, setPlayIdTextInput] = useState(initialParams.playIdText ?? '');
  const [borderMode, setBorderMode] = useState<'preset' | 'custom'>(
    resolveEmbedBorderPresetKey(initialParams.borderColor) !== null ? 'preset' : 'custom'
  );
  const [customBorderInput, setCustomBorderInput] = useState(
    resolveEmbedBorderPresetKey(initialParams.borderColor) === null ? initialParams.borderColor : ''
  );

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

  React.useEffect(() => {
    const normalizedParams = normalizeEmbedBuilderParamsForSource(builderParams);
    if (
      normalizedParams.listEnabled !== builderParams.listEnabled ||
      normalizedParams.playerSize !== builderParams.playerSize
    ) {
      updateBuilderParams({
        listEnabled: normalizedParams.listEnabled,
        playerSize: normalizedParams.playerSize,
      });
    }
  }, [
    builderParams.channel,
    builderParams.clip,
    builderParams.item,
    builderParams.itemChapter,
    builderParams.itemSoundbite,
    builderParams.listEnabled,
    builderParams.playerSize,
    builderParams.playlist,
    updateBuilderParams,
  ]);

  const handlePlayerSizeChange = (playerSize: EmbedBuilderPlayerSize) => {
    const defaultMediaPreference = resolveDefaultMediaPreferenceForPlayerSize(playerSize);

    updateBuilderParams({
      playerSize,
      mediaPreference: defaultMediaPreference,
    });
  };

  const handleListEnabledChange = (listEnabled: boolean) => {
    if (
      listEnabled &&
      builderParams.item !== null &&
      builderParams.playIdText === null &&
      builderParams.playlistItem === null &&
      builderParams.listContentType !== 'chapters'
    ) {
      setPlayIdTextInput(builderParams.item);
      updateBuilderParams({
        listEnabled,
        playIdText: builderParams.item,
      });
      return;
    }

    updateBuilderParams({
      listEnabled,
    });
  };

  const handleMediaPreferenceChange = (mediaPreference: EmbedPresentationQuery) => {
    if (mediaPreference === 'video' && builderParams.playerSize === 'compact') {
      return;
    }
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

  const commitStartTimeInput = (event: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseStartSecondsInput(event.target.value);
    setStartTimeInput(String(parsed));
    updateBuilderParams({ startSeconds: parsed });
  };

  const commitListVisibleRowsInput = (event: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseListVisibleRowsInput(event.target.value);
    setListVisibleRowsInput(String(parsed));
    updateBuilderParams({ listVisibleRows: parsed });
  };

  const commitCustomBorderInput = (event: React.FocusEvent<HTMLInputElement>) => {
    setCustomBorderInput(event.target.value);
    updateBuilderParams({ borderColor: event.target.value });
  };

  const commitPlayIdTextInput = (event: React.FocusEvent<HTMLInputElement>) => {
    const trimmed = event.target.value.trim();
    setPlayIdTextInput(trimmed);
    updateBuilderParams({ playIdText: trimmed === '' ? null : trimmed });
  };

  const listContentOptions = resolveEmbedBuilderListContentOptions(builderParams);
  const listAvailability = resolveEmbedBuilderListAvailability(builderParams);
  const normalizedParams = normalizeEmbedBuilderParamsForSource(builderParams);
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
    playerSize: normalizedParams.playerSize,
    listEnabled: normalizedParams.listEnabled,
    listContentType: normalizedListContentType,
    listSort: normalizedListSort,
    listRange: normalizedListRange,
  };

  const { layout, playerSize } = resolveEmbedBuilderPresentation(effectiveParams);
  const showListContentSelector = layout === 'list' && listContentOptions.length > 1;
  const showListSortSelector = layout === 'list' && listContentOptions.length > 0;
  const showListRangeSelector = showListSortSelector && effectiveParams.listSort === 'top';
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
      title: embedIframeTitle,
      height: getEmbedIframeHeightForPlayerSize(layout, playerSize, {
        listVisibleRows: effectiveParams.listVisibleRows,
        aspectRatio: effectiveParams.aspectRatio,
        includePresentationSelector: false,
      }),
      layout,
      playerSize,
      presentation: effectiveParams.mediaPreference,
      aspectRatio: effectiveParams.aspectRatio,
      borderColor: effectiveParams.borderColor,
    });
  }, [
    effectiveParams.aspectRatio,
    effectiveParams.borderColor,
    effectiveParams.listVisibleRows,
    effectiveParams.mediaPreference,
    embedTarget,
    embedIframeTitle,
    embedUrl,
    layout,
    playerSize,
  ]);

  const previewIframeHeightClassKey = getEmbedPreviewIframeHeightClassKey(layout, playerSize);
  const isResponsivePlayerSize = playerSize === 'responsive';
  const isCompactPlayerSize = playerSize === 'compact';
  const isResponsiveSingle = !effectiveParams.listEnabled && playerSize === 'responsive';
  const previewFrameClassName = [
    styles.previewFrame,
    isResponsiveSingle ? styles.previewFrameResponsive : '',
    styles[previewIframeHeightClassKey],
  ]
    .filter((className) => className !== '')
    .join(' ');
  const previewStyle = buildEmbedBuilderPreviewFrameStyle({
    layout,
    playerSize,
    listEnabled: effectiveParams.listEnabled,
    listVisibleRows: effectiveParams.listVisibleRows,
    aspectRatio: effectiveParams.aspectRatio,
  });

  const playerSizeLabels: Record<EmbedBuilderPlayerSize, string> = {
    compact: tFeatures('embed_type_compact'),
    responsive: tFeatures('embed_type_responsive'),
  };

  const listToggleValue = effectiveParams.listEnabled ? 'on' : 'off';
  const listOnDisabled = listAvailability === 'forced-off';
  const listOffDisabled = listAvailability === 'forced-on';
  const listHelpKey:
    'embed_list_help' | 'embed_list_help_forced_on' | 'embed_list_help_forced_off' =
    listAvailability === 'forced-on'
      ? 'embed_list_help_forced_on'
      : listAvailability === 'forced-off'
        ? 'embed_list_help_forced_off'
        : 'embed_list_help';

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
  const borderColorSelectedValue =
    borderMode === 'custom' ? 'custom' : (selectedBorderPresetKey ?? 'darker-gray');

  return (
    <div data-testid="embed-builder-page">
      <FormStack>
        <div
          className={previewFrameClassName}
          data-testid="embed-builder-preview"
          style={previewStyle}
        >
          {embedUrl !== null ? (
            <iframe
              className={styles.previewIframe}
              src={embedUrl}
              title={embedIframeTitle}
              allow={EMBED_IFRAME_ALLOW}
            />
          ) : null}
        </div>

        <FormInset
          data-testid="embed-builder-controls"
          heading={tFeatures('embed_builder_options')}
          headingId="embed-builder-options-heading"
        >
          <FormStack>
            <div data-testid="embed-builder-type-selector">
              <RadioButton
                className={styles.radioField}
                eyebrow={tFeatures('embed_type_label')}
                help={tFeatures('embed_type_help')}
                helpAriaLabel={fieldHelpAriaLabel}
                name="embed_builder_type"
                onChange={(value) => {
                  if (isEmbedBuilderPlayerSize(value)) {
                    handlePlayerSizeChange(value);
                  }
                }}
                options={EMBED_BUILDER_PLAYER_SIZES.map((playerSize) => ({
                  label: playerSizeLabels[playerSize],
                  value: playerSize,
                }))}
                selectedValue={effectiveParams.playerSize}
              />
            </div>

            <div data-testid="embed-builder-list-selector">
              <RadioButton
                className={styles.radioField}
                eyebrow={tFeatures('embed_list_label')}
                help={tFeatures(listHelpKey)}
                helpAriaLabel={fieldHelpAriaLabel}
                name="embed_builder_list"
                onChange={(value) => {
                  if (isEmbedBuilderListToggleValue(value)) {
                    handleListEnabledChange(value === 'on');
                  }
                }}
                options={[
                  { label: tFeatures('embed_list_on'), value: 'on', disabled: listOnDisabled },
                  { label: tFeatures('embed_list_off'), value: 'off', disabled: listOffDisabled },
                ]}
                selectedValue={listToggleValue}
              />
            </div>

            <div data-testid="embed-builder-prefer-selector">
              <RadioButton
                className={styles.radioField}
                eyebrow={tFeatures('embed_prefer_label')}
                help={tFeatures('embed_prefer_help')}
                helpAriaLabel={fieldHelpAriaLabel}
                name="embed_builder_prefer"
                onChange={(value) => {
                  if (isEmbedPresentationQuery(value)) {
                    handleMediaPreferenceChange(value);
                  }
                }}
                options={[
                  { label: tFeatures('embed_prefer_audio'), value: 'audio' },
                  {
                    label: tFeatures('embed_prefer_video'),
                    value: 'video',
                    disabled: isCompactPlayerSize,
                  },
                ]}
                selectedValue={effectiveParams.mediaPreference}
              />
            </div>

            {isResponsivePlayerSize ? (
              <div data-testid="embed-builder-aspect-ratio-selector">
                <RadioButton
                  className={styles.radioField}
                  eyebrow={tFeatures('embed_aspect_ratio_label')}
                  help={tFeatures('embed_aspect_ratio_help')}
                  helpAriaLabel={fieldHelpAriaLabel}
                  name="embed_builder_aspect_ratio"
                  onChange={(value) => {
                    if (value === '16x9' || value === '4x3' || value === '1x1') {
                      updateBuilderParams({ aspectRatio: value });
                    }
                  }}
                  options={[
                    { label: tFeatures('embed_aspect_ratio_16_9'), value: '16x9' },
                    { label: tFeatures('embed_aspect_ratio_4_3'), value: '4x3' },
                    { label: tFeatures('embed_aspect_ratio_1_1'), value: '1x1' },
                  ]}
                  selectedValue={effectiveParams.aspectRatio}
                />
              </div>
            ) : null}

            <div data-testid="embed-builder-border-color-selector">
              <RadioButton
                className={styles.radioField}
                eyebrow={tFeatures('embed_border_color_label')}
                help={tFeatures('embed_border_color_help')}
                helpAriaLabel={fieldHelpAriaLabel}
                name="embed_builder_border_color"
                onChange={(value) => {
                  if (value === 'custom') {
                    handleSelectBorderCustom();
                    return;
                  }
                  if (isEmbedBorderColorPresetKey(value)) {
                    handleSelectBorderPreset(value);
                  }
                }}
                options={[
                  ...EMBED_BORDER_COLOR_PRESET_KEYS.map((key) => ({
                    label: borderColorLabels[key],
                    value: key,
                  })),
                  { label: tFeatures('embed_border_color_custom'), value: 'custom' },
                ]}
                selectedValue={borderColorSelectedValue}
              />
              {borderMode === 'custom' ? (
                <div data-testid="embed-builder-border-color-custom">
                  <TextInput
                    type="text"
                    name="embed_border_color_custom"
                    value={customBorderInput}
                    eyebrow={tFeatures('embed_border_color_custom_label')}
                    info={tFeatures('embed_border_color_custom_help')}
                    infoAriaLabel={fieldHelpAriaLabel}
                    onChange={(event) => {
                      setCustomBorderInput(event.target.value);
                    }}
                    onBlur={commitCustomBorderInput}
                  />
                </div>
              ) : null}
            </div>

            {showListContentSelector ? (
              <div data-testid="embed-builder-list-content-selector">
                <RadioButton
                  className={styles.radioField}
                  eyebrow={tFeatures('embed_list_content_label')}
                  help={tFeatures('embed_list_content_help')}
                  helpAriaLabel={fieldHelpAriaLabel}
                  name="embed_builder_list_content"
                  onChange={(value) => {
                    if (isEmbedBuilderListContentType(value, listContentOptions)) {
                      handleListContentTypeChange(value);
                    }
                  }}
                  options={listContentOptions.map((listContentType) => ({
                    label: listContentLabels[listContentType],
                    value: listContentType,
                  }))}
                  selectedValue={effectiveParams.listContentType}
                />
              </div>
            ) : null}

            {showListSortSelector ? (
              <div data-testid="embed-builder-list-sort-selector">
                <RadioButton
                  className={styles.radioField}
                  eyebrow={tFeatures('embed_list_sort_label')}
                  help={tFeatures('embed_list_sort_help')}
                  helpAriaLabel={fieldHelpAriaLabel}
                  name="embed_builder_list_sort"
                  onChange={(value) => {
                    if (isEmbedBuilderListSort(value, listSortOptions)) {
                      handleListSortChange(value);
                    }
                  }}
                  options={listSortOptions.map((listSort) => ({
                    label: listSortLabels[listSort],
                    value: listSort,
                  }))}
                  selectedValue={effectiveParams.listSort}
                />
              </div>
            ) : null}

            {showListRangeSelector ? (
              <div data-testid="embed-builder-list-range-selector">
                <RadioButton
                  className={styles.radioField}
                  eyebrow={tFeatures('embed_list_range_label')}
                  help={tFeatures('embed_list_range_help')}
                  helpAriaLabel={fieldHelpAriaLabel}
                  name="embed_builder_list_range"
                  onChange={(value) => {
                    if (isQueryParamsStatsRange(value)) {
                      handleListRangeChange(value);
                    }
                  }}
                  options={QUERY_PARAMS_STATS_RANGE_VALUES.map((listRange) => ({
                    label: listRangeLabels[listRange],
                    value: listRange,
                  }))}
                  selectedValue={effectiveParams.listRange ?? 'all-time'}
                />
              </div>
            ) : null}

            <div data-testid="embed-builder-start-time">
              <CompactNumericInput
                name="embed_start_time"
                min={0}
                step={1}
                value={startTimeInput}
                eyebrow={tFeatures('embed_start_time_seconds')}
                eyebrowPlacement="field"
                info={tFeatures('embed_start_time_help')}
                infoAriaLabel={fieldHelpAriaLabel}
                onChange={(event) => {
                  setStartTimeInput(event.target.value);
                }}
                onBlur={commitStartTimeInput}
              />
            </div>
            {layout === 'list' ? (
              <div data-testid="embed-builder-list-visible-rows">
                <CompactNumericInput
                  name="embed_list_visible_rows"
                  min={EMBED_LIST_VISIBLE_ROWS_MIN}
                  max={EMBED_LIST_VISIBLE_ROWS_MAX}
                  step={1}
                  value={listVisibleRowsInput}
                  eyebrow={tFeatures('embed_list_items_visible')}
                  eyebrowPlacement="field"
                  info={tFeatures('embed_list_items_visible_help')}
                  infoAriaLabel={fieldHelpAriaLabel}
                  onChange={(event) => {
                    setListVisibleRowsInput(event.target.value);
                  }}
                  onBlur={commitListVisibleRowsInput}
                />
              </div>
            ) : null}

            <Accordion
              contentClassName={styles.advancedContent}
              header={tFeatures('embed_advanced')}
              size="small"
            >
              <FormStack>
                {layout === 'list' ? (
                  <CompactTextInput
                    type="text"
                    name="embed_play_id_text"
                    value={playIdTextInput}
                    eyebrow={tFeatures('embed_play_id_text')}
                    eyebrowPlacement="field"
                    info={tFeatures('embed_play_id_text_help')}
                    infoAriaLabel={fieldHelpAriaLabel}
                    onChange={(event) => {
                      setPlayIdTextInput(event.target.value);
                    }}
                    onBlur={commitPlayIdTextInput}
                  />
                ) : null}
              </FormStack>
            </Accordion>
          </FormStack>
        </FormInset>

        <FormInset
          data-testid="embed-builder-code-section"
          heading={tFeatures('embed_code')}
          headingId="embed-builder-code-heading"
          headingAccessory={
            <PopoverIcon
              ariaLabel={fieldHelpAriaLabel}
              body={tFeatures('embed_code_help')}
              icon={<FaCircleQuestion aria-hidden className={styles.helpIcon} />}
              interaction="click"
            />
          }
        >
          <CodeBlock
            copiedLabel={tFeatures('copied')}
            copyLabel={tFeatures('copy')}
            copyPlacement="aside"
            testId="embed-builder-code"
            value={embedCode}
          />
        </FormInset>
      </FormStack>
    </div>
  );
}
