'use client';

import { useTranslations } from 'next-intl';

export function useManagementTableChrome() {
  const t = useTranslations('tableShared');
  const tc = useTranslations('common');

  return {
    bulkAria: {
      selectAll: t('bulk.selectAllAria'),
      selectRow: t('bulk.selectRowAria'),
    },
    deleteConfirmLabels: {
      cancelLabel: tc('cancel'),
      closeButtonAriaLabel: tc('closeModalAria'),
      confirmLabel: tc('confirm'),
      modalAriaLabel: t('confirmDelete.aria'),
    },
    filterLabels: {
      filterColumnsLabel: t('filterColumnsLabel'),
      funnelAriaLabel: t('filterColumnsAriaLabel'),
      searchPlaceholder: t('searchPlaceholder'),
    },
    sortAriaForColumn: (columnLabel: string) => t('sortAriaTemplate', { column: columnLabel }),
  };
}
