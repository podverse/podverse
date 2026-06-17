import classNames from 'classnames';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import styles from './FormInset.module.scss';

export type FormInsetProps = {
  children: ReactNode;
  className?: string;
  /** When set, renders a section heading above the inset panel with half of {@link FormStack} gap. */
  heading?: ReactNode;
  /** `id` for the heading element; also used for `aria-labelledby` on the section wrapper. */
  headingId?: string;
  /** Optional control beside the heading (for example a help popover). */
  headingAccessory?: ReactNode;
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children'>;

/**
 * Inset panel for stacked form controls or related settings, visually separated
 * from surrounding page content (e.g. a live preview above the form).
 *
 * Pass `heading` to group a section title with the inset (`calc(var(--form-gap) / 2)`).
 * Stack headed sections in FormStack for spacing between blocks.
 */
export function FormInset({
  children,
  className,
  heading,
  headingId,
  headingAccessory,
  ...rest
}: FormInsetProps) {
  const panel = (
    <div className={classNames(styles.root, className)} {...(heading === undefined ? rest : {})}>
      {children}
    </div>
  );

  if (heading === undefined) {
    return panel;
  }

  const headingContent =
    typeof heading === 'string' ? (
      <h2 className={styles.heading} id={headingId}>
        {heading}
      </h2>
    ) : (
      heading
    );

  return (
    <section
      aria-labelledby={headingId}
      className={styles.section}
      {...(heading === undefined ? {} : rest)}
    >
      <div className={styles.headingRow}>
        {headingContent}
        {headingAccessory}
      </div>
      {panel}
    </section>
  );
}
