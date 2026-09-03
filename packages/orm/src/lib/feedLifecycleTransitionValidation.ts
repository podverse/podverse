/**
 * Lifecycle transition rules. Allowed edges (base matrix):
 * - `active` → `pending_archive`
 * - `pending_archive` → `archived`
 * - `active` → `takedown`
 * - `pending_archive` → `takedown`
 * - `archived` → `takedown`
 * - `takedown` → `active` **only** with operator un-takedown path (`operatorUntakedown`)
 *
 * Disallowed without **`explicitManagementOverride`**:
 * - `archived` → `active`
 * - `takedown` → `pending_archive`
 *
 * Callers must persist **source** (`parser` | `archiver` | `admin` | `system`) and **note** on
 * `feed_lifecycle_event` rows when applying transitions (not enforced here).
 */

import { FeedLifecycleStateKeyEnum } from '@orm/entities/feed/feedLifecycleStateType.js';

export type LifecycleTransitionValidationOptions = {
  /**
   * Allows normally forbidden transitions:
   * `archived`→`active`, `takedown`→`pending_archive`.
   */
  explicitManagementOverride?: boolean;
  /** Required for `takedown`→`active` (operator un-takedown). */
  operatorUntakedown?: boolean;
};

const BASE_ALLOWED_TRANSITIONS: ReadonlyArray<
  readonly [FeedLifecycleStateKeyEnum, FeedLifecycleStateKeyEnum]
> = [
  [FeedLifecycleStateKeyEnum.Active, FeedLifecycleStateKeyEnum.PendingArchive],
  [FeedLifecycleStateKeyEnum.PendingArchive, FeedLifecycleStateKeyEnum.Archived],
  [FeedLifecycleStateKeyEnum.Active, FeedLifecycleStateKeyEnum.Takedown],
  [FeedLifecycleStateKeyEnum.PendingArchive, FeedLifecycleStateKeyEnum.Takedown],
  [FeedLifecycleStateKeyEnum.Archived, FeedLifecycleStateKeyEnum.Takedown],
];

export function isLifecycleTransitionAllowed(
  from: FeedLifecycleStateKeyEnum,
  to: FeedLifecycleStateKeyEnum,
  options?: LifecycleTransitionValidationOptions
): boolean {
  if (from === to) {
    return true;
  }

  if (from === FeedLifecycleStateKeyEnum.Takedown && to === FeedLifecycleStateKeyEnum.Active) {
    return options?.operatorUntakedown === true;
  }

  if (from === FeedLifecycleStateKeyEnum.Archived && to === FeedLifecycleStateKeyEnum.Active) {
    return options?.explicitManagementOverride === true;
  }

  if (
    from === FeedLifecycleStateKeyEnum.Takedown &&
    to === FeedLifecycleStateKeyEnum.PendingArchive
  ) {
    return options?.explicitManagementOverride === true;
  }

  return BASE_ALLOWED_TRANSITIONS.some(([a, b]) => a === from && b === to);
}

export function assertLifecycleTransitionAllowed(
  from: FeedLifecycleStateKeyEnum,
  to: FeedLifecycleStateKeyEnum,
  options?: LifecycleTransitionValidationOptions
): void {
  if (isLifecycleTransitionAllowed(from, to, options)) {
    return;
  }

  throw new Error(
    `Disallowed lifecycle transition: ${from} -> ${to}` +
      (options?.explicitManagementOverride === true ? ' (override requested)' : '') +
      (options?.operatorUntakedown === true ? ' (operator untakedown)' : '')
  );
}
