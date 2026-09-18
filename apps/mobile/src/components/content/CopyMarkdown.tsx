import { Text, View } from 'react-native';

import { parseCopyMarkdown } from '@podverse/helpers';

import { useTheme } from '../../theme/useTheme';

type CopyMarkdownProps = {
  markdown: string;
};

export function CopyMarkdown({ markdown }: CopyMarkdownProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const blocks = parseCopyMarkdown(markdown);

  return (
    <View>
      {blocks.map((block, blockIndex) => {
        if (block.type === 'heading') {
          return (
            <Text
              accessibilityRole="header"
              key={`heading-${blockIndex}`}
              style={{
                color: themeStyles.textPrimary.color,
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
                  style={{ color: themeStyles.textPrimary.color, marginBottom: tokens.spacing.xs }}
                >
                  {'• '}
                  {item.map((span) => span.text).join('')}
                </Text>
              ))}
            </View>
          );
        }
        return (
          <Text
            key={`paragraph-${blockIndex}`}
            style={{ color: themeStyles.textPrimary.color, marginBottom: tokens.spacing.md }}
          >
            {block.spans.map((span) => span.text).join('')}
          </Text>
        );
      })}
    </View>
  );
}
