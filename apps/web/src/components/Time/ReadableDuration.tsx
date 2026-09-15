'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';

import type { DTOItem, QueueResourcesAbridgedIndex } from '@podverse/helpers';
import { formatCompactPlaybackDurationFromSeconds } from '@podverse/helpers';

type ReadableDurationProps = {
  durationStr: string | null;
  positionStr: string | null;
};

export function getDurationAndPositionStr(
  item: DTOItem,
  queueResourcesAbridgedIndex: QueueResourcesAbridgedIndex
): { durationStr: string | null; positionStr: string } {
  const queueResourceAbridged = queueResourcesAbridgedIndex.items?.[item.id];
  let durationStr = item.item_about?.duration ? item.item_about.duration.toString() : null;
  let positionStr = '';

  if (queueResourceAbridged) {
    if (Number(queueResourceAbridged.d) > 0) {
      durationStr = queueResourceAbridged?.d?.toString() || null;
    }
    if (Number(queueResourceAbridged.p) > 0) {
      positionStr = queueResourceAbridged?.p?.toString() || '';
    }
  }

  return { durationStr, positionStr };
}

export const ReadableDuration: React.FC<ReadableDurationProps> = ({ durationStr, positionStr }) => {
  const tInfo = useTranslations('info');
  const position = positionStr ? Number(positionStr) : null;
  const duration = durationStr ? Number(durationStr) : null;
  const formatSeconds = (seconds: number): string | null =>
    formatCompactPlaybackDurationFromSeconds(seconds, (unit, count) =>
      tInfo(unit === 'hour' ? 'time.hr' : 'time.min', { count })
    );

  if (position && duration) {
    const readableTime = formatSeconds(duration - position);
    if (readableTime === null) {
      return '';
    }
    return tInfo('time.left', { timeRemaining: readableTime });
  }
  if (duration) {
    return formatSeconds(duration) ?? '';
  }
  return '';
};
