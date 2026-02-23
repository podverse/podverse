'use client';

import React, { forwardRef } from 'react';

import styles from '../../styles/components/Tooltip/Tooltip.module.scss';

type TooltipProps = {
  children: React.ReactNode;
  /** Inline style for position/size (e.g. position: fixed, top, left, width, maxWidth). */
  style?: React.CSSProperties;
  /** Optional class name for the tooltip wrapper. */
  className?: string;
  /** When true, render an arrow pointing down (use with --arrow-left CSS var for horizontal position). */
  showArrow?: boolean;
  /** Horizontal position of the arrow in px; sets CSS custom property --arrow-left. */
  arrowLeft?: number;
  /** pointer-events; default 'none' for ephemeral tooltips, 'auto' when tooltip is interactive (e.g. pinned). */
  pointerEvents?: 'auto' | 'none';
};

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  { children, style, className, showArrow = false, arrowLeft, pointerEvents = 'none' },
  ref
) {
  const tooltipStyle: React.CSSProperties = {
    ...style,
    pointerEvents,
    ...(arrowLeft !== undefined
      ? ({ '--arrow-left': `${arrowLeft}px` } as React.CSSProperties)
      : {}),
  };

  return (
    <div
      ref={ref}
      className={`${styles.tooltip} ${showArrow ? styles.tooltipWithArrow : ''} ${className ?? ''}`.trim()}
      role="tooltip"
      style={tooltipStyle}
    >
      {children}
    </div>
  );
});
