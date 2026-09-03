import type { ViewStyle } from 'react-native';

import type { ThemeTokens } from '@podverse/design-tokens';

/**
 * Page-body gutter under HeaderBar and around screen lists: `spacing.lg` above the first content
 * and on both sides. Internal gaps (input → results, row → row) stay on the screen.
 */
export function screenBodyInsets(
  spacing: ThemeTokens['spacing']
): Pick<ViewStyle, 'paddingHorizontal' | 'paddingTop'> {
  return {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  };
}
