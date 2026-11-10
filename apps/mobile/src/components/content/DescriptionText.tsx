import type { ReactElement, ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { StyleProp, TextStyle } from 'react-native';
import { Linking, Pressable, Text, View } from 'react-native';

import type { DescriptionNode } from '@podverse/helpers';
import { readDescriptionDocument } from '@podverse/helpers';
import { splitDescriptionClocks } from '@podverse/helpers/descriptionClocks';
import { isValidHttpUrl } from '@podverse/helpers-validation/client';

import { useTheme } from '../../theme/useTheme';

/**
 * Collapsed plain-text length for channel About and for item Summary outside the full player.
 * Callers still pass this; the component shows the full notes and leaves Show more commented out.
 * The full-player sheet sizes its own preview from the sheet height.
 */
export const DESCRIPTION_PROSE_COLLAPSE_LENGTH = 720;

export type DescriptionTextProps = {
  html: string | null | undefined;
  /**
   * When this changes, the expanded state resets. Pass the channel or item id so a new entity
   * starts collapsed. Kept for a later Show more restore; full notes show on every paint today.
   */
  resetKey?: string | number | null;
  /**
   * Character limit for the collapsed plain-text preview. `null` always shows the full
   * description (clip Summary). Kept for a later Show more restore; full notes show on every
   * paint today.
   */
  collapseLength?: number | null;
  /**
   * When collapsed, clamp the preview to this many lines. `collapseLength` still bounds how
   * much plain text is mounted. Kept for a later Show more restore; full notes show on every
   * paint today.
   */
  collapsedMaxLines?: number;
  textStyle?: StyleProp<TextStyle>;
  showMoreStyle?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  testID?: string;
  /** Kept for a later Show more restore; the toggle is commented out today. */
  toggleTestID?: string;
  /** Shown when the description is empty after stripping. */
  emptyLabel?: string;
  /**
   * When set, a clock in this item's prose seeks that item. Channel About omits it.
   * Text already inside a link is left alone.
   */
  onDescriptionClock?: (seconds: number) => void;
  /**
   * Set when Podverse shortened the stored notes. An item gets a link to its own page when it has
   * one; a channel gets a sentence, because its website is already in About.
   */
  truncation?: DescriptionTruncation;
};

export type DescriptionTruncation = { kind: 'item' | 'channel'; linkUrl: string | null };

type ClockRenderOptions = {
  onDescriptionClock?: (seconds: number) => void;
  clockLabel: (clockText: string) => string;
  textStyle?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  insideLink: boolean;
};

const openExternalUrl = async (href: string): Promise<void> => {
  try {
    await Linking.openURL(href);
  } catch (error) {
    console.warn('Could not open a description link', href, error);
  }
};

const renderClockText = (
  text: string,
  keyPrefix: string,
  options: ClockRenderOptions
): ReactNode => {
  if (options.insideLink || options.onDescriptionClock === undefined) {
    return text;
  }

  const parts = splitDescriptionClocks(text);
  const hasClock = parts.some((part) => part.kind === 'clock');
  if (!hasClock) {
    return text;
  }

  const onDescriptionClock = options.onDescriptionClock;
  return parts.map((part, index) => {
    if (part.kind === 'text') {
      return part.text;
    }

    return (
      <Text
        key={`${keyPrefix}-c-${index}`}
        accessibilityLabel={options.clockLabel(part.text)}
        accessibilityRole="link"
        onPress={() => {
          onDescriptionClock(part.seconds);
        }}
        style={options.linkStyle ?? options.textStyle}
      >
        {part.text}
      </Text>
    );
  });
};

const renderInlineNodes = (
  nodes: DescriptionNode[],
  keyPrefix: string,
  options: ClockRenderOptions
): ReactNode[] => {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    if (node.kind === 'text') {
      return (
        <Text key={key} style={options.textStyle}>
          {renderClockText(node.text, key, options)}
        </Text>
      );
    }

    if (node.kind === 'br') {
      return (
        <Text key={key} style={options.textStyle}>
          {'\n'}
        </Text>
      );
    }

    if (node.kind === 'a') {
      return (
        <Text
          key={key}
          accessibilityRole="link"
          onPress={() => {
            void openExternalUrl(node.href);
          }}
          style={options.linkStyle ?? options.textStyle}
        >
          {renderInlineNodes(node.children, key, { ...options, insideLink: true })}
        </Text>
      );
    }

    if (node.kind === 'strong') {
      return (
        <Text key={key} style={[options.textStyle, { fontWeight: '700' }]}>
          {renderInlineNodes(node.children, key, options)}
        </Text>
      );
    }

    if (node.kind === 'em') {
      return (
        <Text key={key} style={[options.textStyle, { fontStyle: 'italic' }]}>
          {renderInlineNodes(node.children, key, options)}
        </Text>
      );
    }

    if (node.kind === 'u') {
      return (
        <Text key={key} style={[options.textStyle, { textDecorationLine: 'underline' }]}>
          {renderInlineNodes(node.children, key, options)}
        </Text>
      );
    }

    // Block nodes nested where inline is expected: flatten to their children.
    if ('children' in node) {
      return (
        <Text key={key} style={options.textStyle}>
          {renderInlineNodes(node.children, key, options)}
        </Text>
      );
    }

    return null;
  });
};

const renderBlockNodes = (
  nodes: DescriptionNode[],
  options: ClockRenderOptions
): ReactElement[] => {
  const blocks: ReactElement[] = [];
  let inlineRun: DescriptionNode[] = [];

  const flushInline = (key: string): void => {
    if (inlineRun.length === 0) {
      return;
    }
    blocks.push(
      <Text key={key} style={options.textStyle}>
        {renderInlineNodes(inlineRun, key, options)}
      </Text>
    );
    inlineRun = [];
  };

  nodes.forEach((node, index) => {
    const key = `b-${index}`;

    if (
      node.kind === 'text' ||
      node.kind === 'br' ||
      node.kind === 'a' ||
      node.kind === 'strong' ||
      node.kind === 'em' ||
      node.kind === 'u'
    ) {
      inlineRun.push(node);
      return;
    }

    flushInline(`inline-${index}`);

    if (node.kind === 'ul' || node.kind === 'ol') {
      node.children.forEach((child, childIndex) => {
        if (child.kind !== 'li') {
          return;
        }
        const bullet = node.kind === 'ol' ? `${childIndex + 1}. ` : '• ';
        blocks.push(
          <Text key={`${key}-li-${childIndex}`} style={options.textStyle}>
            {bullet}
            {renderInlineNodes(child.children, `${key}-li-${childIndex}`, options)}
          </Text>
        );
      });
      return;
    }

    if (node.kind === 'li') {
      blocks.push(
        <Text key={key} style={options.textStyle}>
          {'• '}
          {renderInlineNodes(node.children, key, options)}
        </Text>
      );
      return;
    }

    // p, h1–h6
    blocks.push(
      <Text key={key} style={options.textStyle}>
        {renderInlineNodes(node.children, key, options)}
      </Text>
    );
  });

  flushInline('inline-end');
  return blocks;
};

/**
 * Channel About and item Summary prose: rich text (links, emphasis, breaks) when markup parses;
 * plain text when it does not. Full stored notes paint on every open.
 */
export function DescriptionText({
  html,
  resetKey = null,
  collapseLength = DESCRIPTION_PROSE_COLLAPSE_LENGTH,
  collapsedMaxLines,
  textStyle,
  showMoreStyle,
  linkStyle,
  testID,
  toggleTestID,
  emptyLabel,
  onDescriptionClock,
  truncation,
}: DescriptionTextProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  // Collapse props stay on the API for a later Show more restore. Full notes show today.
  void resetKey;
  void collapseLength;
  void collapsedMaxLines;
  void toggleTestID;

  const document = useMemo(() => readDescriptionDocument(html), [html]);
  const plain = document.plain;

  if (plain.length === 0) {
    if (emptyLabel === undefined || emptyLabel.length === 0) {
      return null;
    }
    return (
      <Text style={textStyle} testID={testID}>
        {emptyLabel}
      </Text>
    );
  }

  const clockOptions: ClockRenderOptions = {
    clockLabel: (clockText) => t('info.summary.play_from', { time: clockText }),
    insideLink: false,
    linkStyle,
    onDescriptionClock,
    textStyle,
  };

  let body: ReactNode;
  if (document.rich !== null) {
    body = <View testID={testID}>{renderBlockNodes(document.rich, clockOptions)}</View>;
  } else if (onDescriptionClock !== undefined) {
    body = (
      <Text style={textStyle} testID={testID}>
        {renderClockText(plain, 'plain', clockOptions)}
      </Text>
    );
  } else {
    body = (
      <Text style={textStyle} testID={testID}>
        {plain}
      </Text>
    );
  }

  let truncationNotice: ReactNode = null;
  if (truncation !== undefined) {
    const linkUrl =
      truncation.kind === 'item' &&
      truncation.linkUrl !== null &&
      isValidHttpUrl(truncation.linkUrl)
        ? truncation.linkUrl
        : null;
    if (linkUrl !== null) {
      const label = t('info.truncation.read_full_show_notes');
      truncationNotice = (
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="link"
          onPress={() => {
            void openExternalUrl(linkUrl);
          }}
          testID={testID === undefined ? undefined : `${testID}-truncation-link`}
        >
          <Text style={showMoreStyle ?? linkStyle}>{label}</Text>
        </Pressable>
      );
    } else {
      truncationNotice = (
        <Text
          style={[showMoreStyle, { color: tokens.text.secondary }]}
          testID={testID === undefined ? undefined : `${testID}-truncation-notice`}
        >
          {t(
            truncation.kind === 'item'
              ? 'info.truncation.show_notes_shortened'
              : 'info.truncation.description_shortened'
          )}
        </Text>
      );
    }
  }

  return (
    <View>
      {body}
      {truncationNotice}
      {/*
      Show more / Show less — restore with collapseLength / collapsedMaxLines / toggleTestID.
      {canCollapse ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={handleToggle}
          testID={toggleTestID}
        >
          <Text style={showMoreStyle}>{t(expanded ? 'info.show_less' : 'info.show_more')}</Text>
        </Pressable>
      ) : null}
      */}
    </View>
  );
}
