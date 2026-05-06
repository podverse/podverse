import classNames from 'classnames';
import type { HTMLAttributes } from 'react';

import styles from './LookupFieldGrid.module.scss';

export type LookupFieldGridProps = HTMLAttributes<HTMLDivElement>;

export function LookupFieldGrid({ className, ...rest }: LookupFieldGridProps) {
  return <div className={classNames(styles.grid, className)} {...rest} />;
}

export type LookupFieldSpacerLabelProps = HTMLAttributes<HTMLDivElement>;

/** Invisible third-column label aligned with {@link Label} row for grid alignment */
export function LookupFieldSpacerLabel({ className, ...rest }: LookupFieldSpacerLabelProps) {
  return <div className={classNames(styles.actionLabelCell, className)} {...rest} />;
}

/** Class names for lookup row controls (merge with field primitives as needed). */
export const lookupFieldGridControlClass = styles.inlineControl;
export const lookupFieldGridButtonClass = styles.inlineControlButton;
export const lookupFieldGridFormBlockClass = styles.formBlock;
