import classNames from 'classnames';

import styles from './CountBadge.module.scss';

export type CountBadgeSize = 'default' | 'corner';

export type CountBadgeProps = {
  count: number;
  max?: number;
  ariaLabel?: string;
  /**
   * `default` is the list-row face. `corner` is the smaller face that sits on an icon corner
   * (the notifications bell). A one-character face is a circle either way.
   */
  size?: CountBadgeSize;
  /**
   * Whether the badge announces itself when its number changes.
   *
   * A single badge on persistent chrome should: the user is elsewhere on the page and the count
   * arriving is news. A list renders one per row, and a screenful of live regions resolving at once
   * is a queue of announcements rather than information — there the badge is named and left for the
   * row to carry, which is why it becomes part of the row's own accessible name.
   */
  announce?: boolean;
};

export function CountBadge({
  announce = true,
  ariaLabel,
  count,
  max = 99,
  size = 'default',
}: CountBadgeProps) {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (safeCount <= 0) {
    return null;
  }

  const displayValue = safeCount > max ? `${max}+` : String(safeCount);
  const className = classNames(
    styles.badge,
    size === 'corner' && styles.corner,
    displayValue.length === 1 && styles.single
  );

  if (!announce) {
    // `img` rather than a bare span: it gives the label somewhere to attach and stops the raw digits
    // being read a second time alongside it.
    return (
      <span aria-label={ariaLabel} className={className} role="img">
        {displayValue}
      </span>
    );
  }

  return (
    <span aria-label={ariaLabel} className={className} role="status">
      {displayValue}
    </span>
  );
}
