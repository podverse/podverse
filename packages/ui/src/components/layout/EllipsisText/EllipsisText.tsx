import classNames from 'classnames';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

import styles from './EllipsisText.module.scss';

export type EllipsisTextProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  children: ReactNode;
  /** Inline `max-width` for the truncated line (e.g. `28rem`). */
  maxWidth?: CSSProperties['maxWidth'];
};

/** Single-line overflow ellipsis; parent flex/grid cells may need `min-width: 0` for truncation to apply. */
export function EllipsisText({ children, className, maxWidth, style, ...rest }: EllipsisTextProps) {
  const mergedStyle: CSSProperties = maxWidth !== undefined ? { ...style, maxWidth } : { ...style };

  return (
    <span className={classNames(styles.root, className)} style={mergedStyle} {...rest}>
      {children}
    </span>
  );
}
