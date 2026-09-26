import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Linking, Text, View } from 'react-native';

import type { CopyMarkdownComponentKey, CopyMarkdownInlineSpan } from '@podverse/helpers';
import { getSafeLinkHref, parseCopyMarkdown } from '@podverse/helpers';

import { useTheme } from '../../theme/useTheme';
import { MembershipFeatureTable } from '../membership/MembershipFeatureTable';
import { TrialLimitationsAccordion } from '../membership/TrialLimitationsAccordion';

type CopyMarkdownProps = {
  markdown: string;
  surface?: 'web' | 'mobile';
  renderComponent?: (key: CopyMarkdownComponentKey) => ReactNode;
};

function defaultRenderComponent(key: CopyMarkdownComponentKey): ReactNode {
  if (key === 'feature_comparison') {
    return (
      <View>
        <MembershipFeatureTable />
        <TrialLimitationsAccordion testID="more-about-trial-limitations" />
      </View>
    );
  }
  return null;
}

function InlineSpans({
  spans,
  color,
  onOpenLink,
}: {
  spans: CopyMarkdownInlineSpan[];
  color: string;
  onOpenLink: (href: string) => void;
}) {
  return (
    <>
      {spans.map((span, spanIndex) => {
        if (span.type === 'link') {
          const href = getSafeLinkHref(span.href);
          if (href === undefined) {
            return (
              <Text key={`span-${spanIndex}`} style={{ color }}>
                {span.text}
              </Text>
            );
          }
          return (
            <Text
              accessibilityRole="link"
              key={`span-${spanIndex}`}
              onPress={() => {
                onOpenLink(href);
              }}
              style={{ color, textDecorationLine: 'underline' }}
            >
              {span.text}
            </Text>
          );
        }
        return (
          <Text key={`span-${spanIndex}`} style={{ color }}>
            {span.text}
          </Text>
        );
      })}
    </>
  );
}

export function CopyMarkdown({
  markdown,
  surface,
  renderComponent = defaultRenderComponent,
}: CopyMarkdownProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const blocks = parseCopyMarkdown(markdown, surface !== undefined ? { surface } : {});
  const textColor = themeStyles.textPrimary.color;

  const openLink = useCallback(async (href: string) => {
    try {
      await Linking.openURL(href);
    } catch (error) {
      console.warn('[CopyMarkdown] Could not open link', href, error);
    }
  }, []);

  return (
    <View>
      {blocks.map((block, blockIndex) => {
        if (block.type === 'heading') {
          return (
            <Text
              accessibilityRole="header"
              key={`heading-${blockIndex}`}
              style={{
                color: textColor,
                fontSize: 20,
                fontWeight: '600',
                marginBottom: tokens.spacing.md,
              }}
            >
              {block.text}
            </Text>
          );
        }
        if (block.type === 'list') {
          return (
            <View key={`list-${blockIndex}`} style={{ marginBottom: tokens.spacing.md }}>
              {block.items.map((item, itemIndex) => (
                <Text
                  key={`item-${blockIndex}-${itemIndex}`}
                  style={{ color: textColor, marginBottom: tokens.spacing.xs }}
                >
                  {'• '}
                  <InlineSpans color={textColor} onOpenLink={openLink} spans={item} />
                </Text>
              ))}
            </View>
          );
        }
        if (block.type === 'image') {
          return null;
        }
        if (block.type === 'component') {
          return (
            <View
              key={`component-${block.key}-${blockIndex}`}
              style={{ marginBottom: tokens.spacing.md }}
            >
              {renderComponent(block.key)}
            </View>
          );
        }
        return (
          <Text
            key={`paragraph-${blockIndex}`}
            style={{ color: textColor, marginBottom: tokens.spacing.md }}
          >
            <InlineSpans color={textColor} onOpenLink={openLink} spans={block.spans} />
          </Text>
        );
      })}
    </View>
  );
}
