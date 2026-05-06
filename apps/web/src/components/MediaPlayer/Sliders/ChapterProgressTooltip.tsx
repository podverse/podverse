'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';

import { Tooltip } from '@podverse/ui';

const TOOLTIP_GAP_ABOVE_BAR = 8;
const VIEWPORT_PADDING = 8;
const TOOLTIP_MAX_WIDTH = 280;

type ChapterProgressTooltipProps = {
  visible: boolean;
  title: string;
  barRect: DOMRect | null;
  percent: number;
};

export const ChapterProgressTooltip: React.FC<ChapterProgressTooltipProps> = ({
  visible,
  title,
  barRect,
  percent,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [clampedLeft, setClampedLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!visible || !barRect || !tooltipRef.current) {
      setClampedLeft(null);
      return;
    }
    const anchorX = barRect.left + percent * barRect.width;
    const viewportWidth = window.innerWidth;
    let left = anchorX - tooltipRef.current.getBoundingClientRect().width / 2;
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING;
    } else if (
      left + tooltipRef.current.getBoundingClientRect().width >
      viewportWidth - VIEWPORT_PADDING
    ) {
      left = viewportWidth - VIEWPORT_PADDING - tooltipRef.current.getBoundingClientRect().width;
    }
    setClampedLeft(left);
  }, [visible, barRect, percent]);

  if (!visible || !barRect || !title.trim()) {
    return null;
  }

  const anchorX = barRect.left + percent * barRect.width;
  const top = barRect.top - TOOLTIP_GAP_ABOVE_BAR;

  return (
    <Tooltip
      ref={tooltipRef}
      style={{
        top: `${top}px`,
        left: clampedLeft !== null ? `${clampedLeft}px` : `${anchorX}px`,
        transform: clampedLeft !== null ? 'translateY(-100%)' : 'translate(-50%, -100%)',
        maxWidth: Math.min(TOOLTIP_MAX_WIDTH, window.innerWidth * 0.9),
      }}
    >
      {title}
    </Tooltip>
  );
};
