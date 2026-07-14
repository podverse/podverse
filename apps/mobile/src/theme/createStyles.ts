import type { UITheme } from '@podverse/design-tokens';
import { getThemeTokens } from '@podverse/design-tokens';

export type MobileThemeStyles = {
  border: {
    borderColor: string;
  };
  buttonPrimary: {
    backgroundColor: string;
    color: string;
  };
  buttonSecondary: {
    backgroundColor: string;
    color: string;
  };
  screen: {
    backgroundColor: string;
  };
  textPrimary: {
    color: string;
  };
  textSecondary: {
    color: string;
  };
};

export const createStyles = (theme: UITheme): MobileThemeStyles => {
  const tokens = getThemeTokens(theme);

  return {
    border: {
      borderColor: tokens.border.tertiary,
    },
    buttonPrimary: {
      backgroundColor: tokens.button.primaryBg,
      color: tokens.button.primaryColor,
    },
    buttonSecondary: {
      backgroundColor: tokens.button.secondaryBg,
      color: tokens.button.secondaryColor,
    },
    screen: {
      backgroundColor: tokens.background.primary,
    },
    textPrimary: {
      color: tokens.text.primary,
    },
    textSecondary: {
      color: tokens.text.secondary,
    },
  };
};
