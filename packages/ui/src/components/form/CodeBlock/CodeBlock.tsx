'use client';

import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';

import { Button } from '../../button/Button/Button';

import styles from './CodeBlock.module.scss';

export type CodeBlockCopyPlacement = 'header' | 'aside';

export type CodeBlockProps = {
  value: string;
  eyebrow?: string;
  copyLabel: string;
  copiedLabel: string;
  onCopy?: () => void;
  className?: string;
  testId?: string;
  /** @default 'header' */
  copyPlacement?: CodeBlockCopyPlacement;
};

export function CodeBlock({
  value,
  eyebrow,
  copyLabel,
  copiedLabel,
  onCopy,
  className,
  testId,
  copyPlacement = 'header',
}: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (value === '') {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }

    onCopy?.();
    setIsCopied(true);

    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const valueTestId = testId !== undefined && testId !== '' ? `${testId}-value` : undefined;
  const copyButton = (
    <Button
      aria-label={isCopied ? copiedLabel : copyLabel}
      className={copyPlacement === 'aside' ? styles.asideCopyButton : undefined}
      disabled={value === ''}
      onClick={() => {
        void handleCopy();
      }}
      type="button"
      variant="secondary"
    >
      {isCopied ? copiedLabel : copyLabel}
    </Button>
  );

  return (
    <div
      className={classNames(
        styles.root,
        copyPlacement === 'aside' ? styles.rootWithAsideCopy : null,
        className
      )}
      data-testid={testId}
    >
      <div className={styles.panel}>
        {copyPlacement === 'header' ? (
          <div className={styles.headerRow}>
            {eyebrow !== undefined && eyebrow !== '' ? (
              <div className={styles.eyebrow}>{eyebrow}</div>
            ) : (
              <span aria-hidden className={styles.headerSpacer} />
            )}
            {copyButton}
          </div>
        ) : null}
        <pre className={styles.code} data-testid={valueTestId}>
          <code>{value}</code>
        </pre>
      </div>
      {copyPlacement === 'aside' ? copyButton : null}
    </div>
  );
}
