import classNames from 'classnames';
import type { HTMLAttributes } from 'react';

import styles from './LookupFieldGrid.module.scss';

export type LookupFieldGridProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * `default` — optional label row above controls (external {@link Label}s plus control row).
   * `inlineEyebrow` — one row; use {@link TextInput} / {@link FormDropdown} `eyebrow` for titles;
   * action column aligns to the bottom of each control so primary buttons line up with inputs.
   */
  variant?: 'default' | 'inlineEyebrow';
};

export function LookupFieldGrid({ className, variant = 'default', ...rest }: LookupFieldGridProps) {
  return (
    <div
      className={classNames(
        variant === 'inlineEyebrow' ? styles.gridInlineEyebrow : styles.grid,
        className
      )}
      {...rest}
    />
  );
}

export type LookupFieldSpacerLabelProps = HTMLAttributes<HTMLDivElement>;

/** Invisible third-column slot for **`LookupFieldGrid`** **`variant="default"`** label-row alignment */
export function LookupFieldSpacerLabel({ className, ...rest }: LookupFieldSpacerLabelProps) {
  return <div className={classNames(styles.actionLabelCell, className)} {...rest} />;
}

/** Class names for lookup row controls (merge with field primitives as needed). */
export const lookupFieldGridControlClass = styles.inlineControl;
export const lookupFieldGridButtonClass = styles.inlineControlButton;
export const lookupFieldGridFormBlockClass = styles.formBlock;
/** Wrap a native `<select>` beside {@link TextInput} so heights match shared form chrome. */
export const lookupFieldGridNativeSelectWrapClass = styles.nativeSelectFormChrome;
