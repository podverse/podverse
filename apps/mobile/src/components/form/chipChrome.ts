import type { TextStyle, ViewStyle } from 'react-native';

import type { ThemeTokens } from '@podverse/design-tokens';

export type ChipChrome = {
  chip: ViewStyle;
  label: TextStyle;
};

/**
 * Chrome for controls that narrow a list (range, category) rather than choose which list to show.
 * Idle matches the unselected media-type pill; active matches the sort chip (accent outline,
 * square radius).
 */
export const filterChipChrome = (
  tokens: ThemeTokens,
  idle: { borderColor: string; textColor: string },
  active: boolean
): ChipChrome => {
  if (active) {
    return {
      chip: {
        backgroundColor: tokens.background.tertiary,
        borderColor: tokens.text.accent,
        borderRadius: tokens.radii.md,
      },
      label: {
        color: tokens.text.accent,
      },
    };
  }

  return {
    chip: {
      backgroundColor: tokens.background.secondary,
      borderColor: idle.borderColor,
      borderRadius: tokens.radii.round,
    },
    label: {
      color: idle.textColor,
    },
  };
};
