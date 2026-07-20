import type { ThemeTokens } from '@podverse/design-tokens';
import { getThemeTokens } from '@podverse/design-tokens';

/**
 * Static spacing / radii scales for modules that render outside a `useTheme()` context. Primitives
 * and screens should prefer `useTheme().tokens.spacing` / `tokens.radii` (theme-reactive) — these
 * ramps are theme-independent in `@podverse/design-tokens`, so any theme yields identical values.
 * Single-sourced from design-tokens; never hardcode spacing/radii numbers elsewhere.
 */
export type SpacingScale = ThemeTokens['spacing'];
export type SpacingKey = keyof SpacingScale;

export type RadiiScale = ThemeTokens['radii'];
export type RadiiKey = keyof RadiiScale;

const BASE_TOKENS = getThemeTokens('dark');

export const spacing: SpacingScale = BASE_TOKENS.spacing;
export const radii: RadiiScale = BASE_TOKENS.radii;
