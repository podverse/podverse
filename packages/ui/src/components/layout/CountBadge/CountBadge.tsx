import styles from './CountBadge.module.scss';

export type CountBadgeProps = {
  count: number;
  max?: number;
  ariaLabel?: string;
};

export function CountBadge({ count, max = 99, ariaLabel }: CountBadgeProps) {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (safeCount <= 0) {
    return null;
  }

  const displayValue = safeCount > max ? `${max}+` : String(safeCount);

  return (
    <span aria-label={ariaLabel} className={styles.badge} role="status">
      {displayValue}
    </span>
  );
}
