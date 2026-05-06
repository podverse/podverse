'use client';

import type { CSSProperties, ReactNode } from 'react';
import { forwardRef } from 'react';

import styles from './Tooltip.module.scss';

type TooltipStyle = CSSProperties & {
  '--arrow-left'?: string;
};

export type TooltipProps = {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  showArrow?: boolean;
  arrowLeft?: number;
  pointerEvents?: 'auto' | 'none';
};

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  { children, style, className, showArrow = false, arrowLeft, pointerEvents = 'none' },
  ref
) {
  const tooltipStyle: TooltipStyle = {
    ...style,
    pointerEvents,
  };

  if (arrowLeft !== undefined) {
    tooltipStyle['--arrow-left'] = `${arrowLeft}px`;
  }

  return (
    <div
      ref={ref}
      className={[styles.tooltip, showArrow ? styles.tooltipWithArrow : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      role="tooltip"
      style={tooltipStyle}
    >
      {children}
    </div>
  );
});
