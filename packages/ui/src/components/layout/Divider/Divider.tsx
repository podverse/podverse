import classNames from 'classnames';

import styles from './Divider.module.scss';

export type DividerProps = {
  className?: string;
  withSpacing?: boolean;
};

export function Divider({ className, withSpacing = false }: DividerProps) {
  return (
    <hr
      className={classNames(
        styles.divider,
        className,
        withSpacing ? styles.dividerWithSpacing : null
      )}
    />
  );
}
