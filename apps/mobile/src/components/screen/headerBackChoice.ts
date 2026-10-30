export type HeaderBackChoice = 'goBack' | 'parentGoBack' | 'resetToInitial' | 'none';

/**
 * Which back control a stack header shows. A screen that is not the stack's first registered
 * route can return there when the stack was opened on that screen and has no history behind it.
 */
export const headerBackChoice = (input: {
  focusedRouteName: string | undefined;
  /**
   * True when this stack has a route under the focused one (`state.index > 0`).
   * The header `back` value is also set when a parent screen can go back, so it
   * is not this flag.
   */
  hasStackBack: boolean;
  initialRouteName: string | undefined;
  parentStackCanGoBack: boolean;
}): HeaderBackChoice => {
  if (input.hasStackBack) {
    return 'goBack';
  }
  if (
    input.initialRouteName !== undefined &&
    input.focusedRouteName !== undefined &&
    input.focusedRouteName !== input.initialRouteName
  ) {
    return 'resetToInitial';
  }
  if (input.parentStackCanGoBack) {
    return 'parentGoBack';
  }
  return 'none';
};
