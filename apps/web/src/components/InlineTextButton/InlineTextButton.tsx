'use client';

import classNames from 'classnames';
import type { ComponentProps } from 'react';

import { Button } from '@podverse/ui';

import styles from './InlineTextButton.module.scss';

export type InlineTextButtonProps = Omit<ComponentProps<typeof Button>, 'variant'>;

/** Inline link appearance on a `<button>` (not navigation). */
export function InlineTextButton({ className, ...rest }: InlineTextButtonProps) {
  return <Button {...rest} className={classNames(styles.root, className)} variant="link" />;
}
