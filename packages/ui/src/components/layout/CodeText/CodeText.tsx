import classNames from 'classnames';
import type { HTMLAttributes } from 'react';

import styles from './CodeText.module.scss';

export type CodeTextProps = HTMLAttributes<HTMLElement> & {
  variant?: 'inline' | 'block';
};

export function CodeText({ variant = 'inline', className, ...rest }: CodeTextProps) {
  const Tag = variant === 'block' ? 'pre' : 'code';
  return (
    <Tag
      className={classNames(variant === 'block' ? styles.block : styles.inline, className)}
      {...rest}
    />
  );
}
