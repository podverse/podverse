/**
 * Whether this row has paid the MoreMenu mount. The menu stays mounted after the first open so
 * close only hides it.
 */
export const shouldMountRowMoreMenu = (hasMoreActions: boolean, hasOpenedSheet: boolean): boolean =>
  hasMoreActions && hasOpenedSheet;
