import { useWindowDimensions } from 'react-native';

import { breakpoints } from '@podverse/design-tokens';

import { resolveColumns, resolveIsTablet } from './resolveColumns';

export type ResponsiveLayout = {
  columns: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
  width: number;
};

/**
 * Shared responsive layout derived from window size + design-token breakpoints.
 * Screens must not hardcode pixel cutoffs — read `isTablet` / `columns` from here.
 */
export function useResponsive(): ResponsiveLayout {
  const { height, width } = useWindowDimensions();

  return {
    columns: resolveColumns(width, breakpoints),
    height,
    isLandscape: width > height,
    isTablet: resolveIsTablet(width, breakpoints),
    width,
  };
}
