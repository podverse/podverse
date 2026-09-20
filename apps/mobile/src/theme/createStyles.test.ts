import { getThemeTokens } from '@podverse/design-tokens';
import { describe, expect, it } from 'vitest';

import { createStyles } from './createStyles';

describe('createStyles paneSheet', () => {
  it('uses page ink on dark so the sheet sits on the black screen', () => {
    const tokens = getThemeTokens('dark');
    expect(createStyles('dark').paneSheet.backgroundColor).toBe(tokens.background.primary);
    expect(createStyles('dark').screen.backgroundColor).toBe(tokens.background.secondary);
  });

  it('uses the card surface on other themes', () => {
    const tokens = getThemeTokens('light');
    expect(createStyles('light').paneSheet.backgroundColor).toBe(tokens.background.secondary);
  });
});
