'use client';

import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';

type ReadableTimeProps = {
  start: string;
  end: string | null;
};

const FALLBACK = '—';

export const ReadableTime: React.FC<ReadableTimeProps> = ({ start, end }) => {
  const locale = useLocale();
  const tInfo = useTranslations('info');

  const isValidDate = (value: string): boolean => {
    if (typeof value !== 'string' || value.trim() === '') return false;
    const parsed = Date.parse(value);
    return !Number.isNaN(parsed);
  };

  if (!isValidDate(start)) {
    return FALLBACK;
  }

  const formatTime = (time: string | Date) =>
    typeof time === 'string'
      ? new Date(time).toLocaleTimeString(locale, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : time.toLocaleTimeString(locale, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

  const startTime = formatTime(start);
  const endTime = end && isValidDate(end) ? formatTime(end) : null;

  const timeText = endTime
    ? tInfo('time.start_end', { timeStart: startTime, timeEnd: endTime })
    : tInfo('time.start', { timeStart: startTime });

  return timeText;
};
