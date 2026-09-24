import type { ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StyleProp, TextStyle } from 'react-native';
import { Linking, Pressable, Text, View } from 'react-native';

import type { DescriptionNode } from '@podverse/helpers';
import { readDescriptionDocument } from '@podverse/helpers';

/** Same collapse length episode and track Summary use. */
export const DESCRIPTION_PROSE_COLLAPSE_LENGTH = 360;

export type DescriptionTextProps = {
  html: string | null | undefined;
  /**
   * When this changes, the expanded state resets. Pass the channel or item id so a new entity
   * starts collapsed.
   */
  resetKey?: string | number | null;
  /**
   * Character limit for the collapsed plain-text preview. `null` always shows the full
   * description (clip Summary).
   */
  collapseLength?: number | null;
  textStyle?: StyleProp<TextStyle>;
  showMoreStyle?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  testID?: string;
  toggleTestID?: string;
  /** Shown when the description is empty after stripping. */
  emptyLabel?: string;
};

const openExternalUrl = async (href: string): Promise<void> => {
  try {
    await Linking.openURL(href);
  } catch (error) {
    console.warn('Could not open a description link', href, error);
  }
};

const renderInlineNodes = (
  nodes: DescriptionNode[],
  keyPrefix: string,
  textStyle: StyleProp<TextStyle> | undefined,
  linkStyle: StyleProp<TextStyle> | undefined
): ReactNode[] => {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    if (node.kind === 'text') {
      return (
        <Text key={key} style={textStyle}>
          {node.text}
        </Text>
      );
    }

    if (node.kind === 'br') {
      return (
        <Text key={key} style={textStyle}>
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
          style={linkStyle ?? textStyle}
        >
          {renderInlineNodes(node.children, key, textStyle, linkStyle)}
        </Text>
      );
    }

    if (node.kind === 'strong') {
      return (
        <Text key={key} style={[textStyle, { fontWeight: '700' }]}>
          {renderInlineNodes(node.children, key, textStyle, linkStyle)}
        </Text>
      );
    }

    if (node.kind === 'em') {
      return (
        <Text key={key} style={[textStyle, { fontStyle: 'italic' }]}>
          {renderInlineNodes(node.children, key, textStyle, linkStyle)}
        </Text>
      );
    }

    if (node.kind === 'u') {
      return (
        <Text key={key} style={[textStyle, { textDecorationLine: 'underline' }]}>
          {renderInlineNodes(node.children, key, textStyle, linkStyle)}
        </Text>
      );
    }

    // Block nodes nested where inline is expected: flatten to their children.
    if ('children' in node) {
      return (
        <Text key={key} style={textStyle}>
          {renderInlineNodes(node.children, key, textStyle, linkStyle)}
        </Text>
      );
    }

    return null;
  });
};

const renderBlockNodes = (
  nodes: DescriptionNode[],
  textStyle: StyleProp<TextStyle> | undefined,
  linkStyle: StyleProp<TextStyle> | undefined
): ReactElement[] => {
  const blocks: ReactElement[] = [];
  let inlineRun: DescriptionNode[] = [];

  const flushInline = (key: string): void => {
    if (inlineRun.length === 0) {
      return;
    }
    blocks.push(
      <Text key={key} style={textStyle}>
        {renderInlineNodes(inlineRun, key, textStyle, linkStyle)}
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
          <Text key={`${key}-li-${childIndex}`} style={textStyle}>
            {bullet}
            {renderInlineNodes(child.children, `${key}-li-${childIndex}`, textStyle, linkStyle)}
          </Text>
        );
      });
      return;
    }

    if (node.kind === 'li') {
      blocks.push(
        <Text key={key} style={textStyle}>
          {'• '}
          {renderInlineNodes(node.children, key, textStyle, linkStyle)}
        </Text>
      );
      return;
    }

    // p, h1–h6
    blocks.push(
      <Text key={key} style={textStyle}>
        {renderInlineNodes(node.children, key, textStyle, linkStyle)}
      </Text>
    );
  });

  flushInline('inline-end');
  return blocks;
};

/**
 * Channel About and item Summary prose: plain text when collapsed or when markup does not parse;
 * rich text (links, emphasis, breaks) when the full description is on screen.
 */
export function DescriptionText({
  html,
  resetKey = null,
  collapseLength = DESCRIPTION_PROSE_COLLAPSE_LENGTH,
  textStyle,
  showMoreStyle,
  linkStyle,
  testID,
  toggleTestID,
  emptyLabel,
}: DescriptionTextProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [resetKey]);

  const document = useMemo(() => readDescriptionDocument(html), [html]);
  const plain = document.plain;
  const canCollapse = collapseLength !== null && plain.length > collapseLength;
  const showRich = !canCollapse || expanded;

  const displayPlain = useMemo(() => {
    if (!canCollapse || expanded || collapseLength === null) {
      return plain;
    }
    return `${plain.slice(0, collapseLength)}…`;
  }, [canCollapse, collapseLength, expanded, plain]);

  const handleToggle = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

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

  let body: ReactNode;
  if (showRich && document.rich !== null) {
    body = <View testID={testID}>{renderBlockNodes(document.rich, textStyle, linkStyle)}</View>;
  } else {
    body = (
      <Text style={textStyle} testID={testID}>
        {displayPlain}
      </Text>
    );
  }

  return (
    <View>
      {body}
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
    </View>
  );
}
