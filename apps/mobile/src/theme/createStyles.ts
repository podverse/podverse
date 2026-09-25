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
  buttonDanger: {
    backgroundColor: string;
    color: string;
  };
  screen: {
    backgroundColor: string;
  };
  /**
   * Raised sheet on the page wash. Dark uses page ink (`background.primary`) so a card can sit on
   * the black screen; other themes use the card surface (`background.secondary`).
   */
  paneSheet: {
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
    buttonDanger: {
      backgroundColor: tokens.button.dangerBg,
      color: tokens.button.dangerColor,
    },
    // Dark full-bleed chrome matches the tab bar (`background.secondary`). Other themes
    // keep `background.primary` so cards (`background.secondary`) sit on a distinct page.
    screen: {
      backgroundColor: theme === 'dark' ? tokens.background.secondary : tokens.background.primary,
    },
    paneSheet: {
      backgroundColor: theme === 'dark' ? tokens.background.primary : tokens.background.secondary,
    },
    textPrimary: {
      color: tokens.text.primary,
    },
    textSecondary: {
      color: tokens.text.secondary,
    },
  };
};
