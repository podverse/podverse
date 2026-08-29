'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import type { DTOAccountNotification, NotificationCategoryValues } from '@podverse/helpers';
import { MainHeader } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { Pagination } from '../../components/Pagination/Pagination';
import { ROUTES } from '../../constants/routes';
import { getApiRequestService } from '../../factories/apiRequestService';
import { emitNotificationsSeenEvent } from '../../hooks/useNotificationsUnseenCount';

import styles from './NotificationsPage.module.scss';

type NotificationsListState = {
  items: DTOAccountNotification[];
  page: number;
  totalPages: number;
};

const INITIAL_STATE: NotificationsListState = {
  items: [],
  page: 1,
  totalPages: 0,
};

const CATEGORY_LABEL_KEYS: Record<NotificationCategoryValues, string> = {
  'new-content': 'category_new_content',
  livestream: 'category_livestream',
  'membership-expiry': 'category_membership_expiry',
  'product-update': 'category_product_update',
  maintenance: 'category_maintenance',
  'terms-of-service': 'category_terms_of_service',
  general: 'category_general',
};

function getRelativeTimeLabel(isoDate: string): string {
  const deltaMs = new Date(isoDate).getTime() - Date.now();
  const deltaMinutes = Math.round(deltaMs / 60_000);
  const absMinutes = Math.abs(deltaMinutes);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (absMinutes < 60) {
    return formatter.format(deltaMinutes, 'minute');
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) {
    return formatter.format(deltaHours, 'hour');
  }

  const deltaDays = Math.round(deltaHours / 24);
  return formatter.format(deltaDays, 'day');
}

export function NotificationsPageClient() {
  const tNotifications = useTranslations('notifications_page');
  const [state, setState] = useState<NotificationsListState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);

  const loadPage = async (page: number) => {
    const data = await getApiRequestService().reqNotificationsList({ page, limit: 20 });
    setState({
      items: data.items,
      page: data.pagination.page,
      totalPages: data.pagination.total_pages,
    });
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        await getApiRequestService().reqNotificationsMarkSeen();
        emitNotificationsSeenEvent();
        if (cancelled) {
          return;
        }
        await loadPage(1);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const onPageChange = async (page: number) => {
    setIsLoading(true);
    try {
      await loadPage(page);
    } finally {
      setIsLoading(false);
    }
  };

  const partitionedRows = useMemo(() => {
    const newRows: DTOAccountNotification[] = [];
    const earlierRows: DTOAccountNotification[] = [];
    for (const item of state.items) {
      if (item.is_new) {
        newRows.push(item);
      } else {
        earlierRows.push(item);
      }
    }
    return { newRows, earlierRows };
  }, [state.items]);

  return (
    <>
      <MainHeader title={tNotifications('title')} />
      <MainWrapper>
        <div className={styles.listWrapper}>
          {isLoading ? <p className={styles.empty}>{tNotifications('loading')}</p> : null}
          {!isLoading && state.items.length === 0 ? (
            <p className={styles.empty}>{tNotifications('empty')}</p>
          ) : null}

          {!isLoading && state.items.length > 0 ? (
            <Pagination
              currentPage={state.page}
              setPage={onPageChange}
              totalPages={state.totalPages}
            >
              <div className={styles.rows}>
                {partitionedRows.newRows.length > 0 ? (
                  <h2 className={styles.sectionHeading}>{tNotifications('new_section')}</h2>
                ) : null}
                {partitionedRows.newRows.map((row) => (
                  <NotificationRow key={row.id} row={row} />
                ))}

                {partitionedRows.earlierRows.length > 0 ? (
                  <h2 className={styles.sectionHeading}>{tNotifications('earlier_section')}</h2>
                ) : null}
                {partitionedRows.earlierRows.map((row) => (
                  <NotificationRow key={row.id} row={row} />
                ))}
              </div>
            </Pagination>
          ) : null}
        </div>
      </MainWrapper>
    </>
  );

  function NotificationRow({ row }: { row: DTOAccountNotification }) {
    const categoryKey = CATEGORY_LABEL_KEYS[row.category];
    const linkPath = row.link_path ?? ROUTES.NOTIFICATIONS;

    return (
      <article className={styles.row}>
        <div className={styles.rowTop}>
          <span className={styles.categoryPill}>{tNotifications(categoryKey)}</span>
          <span className={styles.timeText}>{getRelativeTimeLabel(row.created_at)}</span>
        </div>
        <h3 className={styles.title}>
          <Link href={linkPath}>{row.title}</Link>
        </h3>
        <p className={styles.body}>
          {row.body !== null && row.body !== '' ? row.body : tNotifications('no_body')}
        </p>
      </article>
    );
  }
}
