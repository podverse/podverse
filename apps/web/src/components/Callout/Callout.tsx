'use client';

import classNames from 'classnames';

import styles from '../../styles/components/Callout/Callout.module.scss';

type CalloutProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Reusable container that visually separates content from the surrounding layout:
 * distinct background (theme secondary) and padding. Use for info panels, asides,
 * or any block that should stand out from the page or form.
 */
export const Callout: React.FC<CalloutProps> = ({ children, className }) => (
  <div className={classNames(styles.callout, className)}>{children}</div>
);
