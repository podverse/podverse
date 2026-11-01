'use client';

import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';

import { formatDateAbbrev, formatDateTimeAbbrev } from '@podverse/helpers';

type ReadableDateProps = {
  date?: string | null;
  /** When true, include the local clock time. List rows leave this off. */
  includeTime?: boolean;
};

export const ReadableDate: React.FC<ReadableDateProps> = ({ date, includeTime = false }) => {
  const locale = useLocale();
  const tMisc = useTranslations('misc');
  const readableDate = date
    ? includeTime
      ? formatDateTimeAbbrev(date, locale)
      : formatDateAbbrev(date, locale)
    : tMisc('unknown_date');

  return readableDate;
};
