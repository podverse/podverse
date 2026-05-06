'use client';

import classNames from 'classnames';
import { useState } from 'react';

import { Button } from '../Button/Button';

import styles from './CopyToClipboardButton.module.scss';

type CopyState = 'idle' | 'copied' | 'error';

export type CopyToClipboardButtonProps = {
  textToCopy: string;
  idleLabel: string;
  copiedLabel: string;
  errorLabel?: string;
  className?: string;
  resetMs?: number;
  onCopied?: () => void;
};

export function CopyToClipboardButton({
  textToCopy,
  idleLabel,
  copiedLabel,
  errorLabel,
  className,
  resetMs = 2000,
  onCopied,
}: CopyToClipboardButtonProps) {
  const [state, setState] = useState<CopyState>('idle');

  const label =
    state === 'copied' ? copiedLabel : state === 'error' && errorLabel ? errorLabel : idleLabel;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setState('copied');
      onCopied?.();
    } catch {
      setState('error');
    } finally {
      setTimeout(() => {
        setState('idle');
      }, resetMs);
    }
  };

  return (
    <Button
      type="button"
      variant="link"
      onClick={() => void handleCopy()}
      className={classNames(styles.button, className)}
    >
      {label}
    </Button>
  );
}
