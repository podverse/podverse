import type { TextStyle, ViewStyle } from 'react-native';

import type { ThemeTokens } from '@podverse/design-tokens';

export type ChipChrome = {
  chip: ViewStyle;
  label: TextStyle;
};

/**
 * Chrome for controls that narrow a list (range, category) rather than choose which list to show.
 * Shape stays square-radiused in both states so the control does not morph. Idle uses the quiet
 * fill of an unselected pill; active matches the sort chip (accent outline and label).
 */
export const filterChipChrome = (
  tokens: ThemeTokens,
  idle: { borderColor: string; textColor: string },
  active: boolean
): ChipChrome => {
  const chip: ViewStyle = {
    borderRadius: tokens.radii.md,
  };

  if (active) {
    return {
      chip: {
        ...chip,
        backgroundColor: tokens.background.tertiary,
        borderColor: tokens.text.accent,
      },
      label: {
        color: tokens.text.accent,
      },
    };
  }

  return {
    chip: {
      ...chip,
      backgroundColor: tokens.background.secondary,
      borderColor: idle.borderColor,
    },
    label: {
      color: idle.textColor,
    },
  };
};
