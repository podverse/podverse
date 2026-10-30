'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AccountNotificationLineLabels, DTOAccountNotification } from '@podverse/helpers';
import {
  ACCOUNT_NOTIFICATION_STREAM_EVENT,
  accountNotificationImageUrl,
  applyNotificationVisitUnread,
  formatAccountNotificationLine,
  formatRelativeTimeLabel,
  resolveNotificationDestinationFromPayload,
} from '@podverse/helpers';
import { FormMaxWidth, Image, MainColumnStack, MainHeader, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { Pagination } from '../../components/Pagination/Pagination';
import { ROUTES } from '../../constants/routes';
import { useNotifications } from '../../contexts/Notifications';
import { getApiRequestService } from '../../factories/apiRequestService';
import { emitNotificationsReadEvent } from '../../hooks/useNotificationsUnreadCount';
import { insertLiveNotificationRow } from './notificationsInboxRows';

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

type NotificationListLoadResult =
  | { status: 'applied'; requestId: number }
  | { status: 'failed'; requestId: number }
  | { status: 'stale' };

/** Source edge requested for the thumbnail. The slot wrapper is what draws the size. */
const NOTIFICATION_ARTWORK_SOURCE_SIZE = 160;

function mergeLiveRows(
  items: DTOAccountNotification[],
  liveRows: DTOAccountNotification[]
): DTOAccountNotification[] {
  let nextItems = items;
  for (const liveRow of liveRows) {
    nextItems = insertLiveNotificationRow(nextItems, liveRow);
  }
  return nextItems;
}

export function NotificationsPageClient() {
  const tNotifications = useTranslations('notifications_page');
  const lineLabels = useMemo<AccountNotificationLineLabels>(
    () => ({
      livestream: tNotifications('line_livestream'),
      'livestream-scheduled': tNotifications('line_livestream_scheduled'),
      'livestream-started': tNotifications('line_livestream_started'),
      new: tNotifications('line_new_content'),
      'new-album': tNotifications('line_new_album'),
      'new-episode': tNotifications('line_new_episode'),
      'new-podcast': tNotifications('line_new_podcast'),
      'new-track': tNotifications('line_new_track'),
      'new-video': tNotifications('line_new_video'),
      'new-video-channel': tNotifications('line_new_video_channel'),
      'podcast-index-feed': tNotifications('line_podcast_index_feed'),
      systemUpdate: tNotifications('line_system_update'),
    }),
    [tNotifications]
  );
  const { subscribeToNotificationStream } = useNotifications();
  const [state, setState] = useState<NotificationsListState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const liveRowsRef = useRef<DTOAccountNotification[]>([]);
  const pendingMarkIdsRef = useRef<Set<number>>(new Set());
  const markingIdsRef = useRef<Set<number>>(new Set());
  const pageRef = useRef(INITIAL_STATE.page);
  const listRequestIdRef = useRef(0);
  const isPageActiveRef = useRef(true);
  const visitUnreadIdsRef = useRef<ReadonlySet<number>>(new Set<number>());

  const loadPage = useCallback(async (page: number): Promise<NotificationListLoadResult> => {
    const requestId = ++listRequestIdRef.current;
    try {
      const data = await getApiRequestService().reqNotificationsList({ page, limit: 20 });
      if (requestId !== listRequestIdRef.current || !isPageActiveRef.current) {
        return { status: 'stale' };
      }
      const visit = applyNotificationVisitUnread(visitUnreadIdsRef.current, data.items);
      visitUnreadIdsRef.current = visit.visitUnreadIds;
      pageRef.current = data.pagination.page;
      setState({
        items: visit.rows,
        page: data.pagination.page,
        totalPages: data.pagination.total_pages,
      });
      return { status: 'applied', requestId };
    } catch {
      if (requestId !== listRequestIdRef.current || !isPageActiveRef.current) {
        return { status: 'stale' };
      }
      // The page keeps the last list it showed. The next load replaces it.
      return { status: 'failed', requestId };
    }
  }, []);

  const markLiveRowsRead = useCallback(() => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    const pendingIds = pendingMarkIdsRef.current;
    const markingIds = markingIdsRef.current;
    for (const id of pendingIds) {
      if (markingIds.has(id)) {
        pendingIds.delete(id);
        continue;
      }
      pendingIds.delete(id);
      markingIds.add(id);
      void getApiRequestService()
        .reqNotificationsMarkReadOne(id)
        .catch(() => {
          // A missing row or a failed request leaves the badge to the next stream event or poll.
        })
        .finally(() => {
          markingIds.delete(id);
        });
    }
  }, []);

  useEffect(() => {
    isPageActiveRef.current = true;
    visitUnreadIdsRef.current = new Set<number>();
    let cancelled = false;

    const loadFirstPageAndMarkRead = async () => {
      setIsLoading(true);
      const result = await loadPage(1);
      if (
        !cancelled &&
        result.status === 'applied' &&
        result.requestId === listRequestIdRef.current &&
        pageRef.current === 1
      ) {
        const appliedRequestId = result.requestId;
        setState((current) => {
          if (appliedRequestId !== listRequestIdRef.current || current.page !== 1) {
            return current;
          }
          const items = mergeLiveRows(current.items, liveRowsRef.current);
          if (items === current.items) {
            return current;
          }
          return { ...current, items };
        });
      }

      try {
        await getApiRequestService().reqNotificationsMarkRead();
        emitNotificationsReadEvent();
      } catch {
        // The loaded list stays visible when Mark All as Read fails.
      }

      if (
        !cancelled &&
        result.status !== 'stale' &&
        result.requestId === listRequestIdRef.current
      ) {
        setIsLoading(false);
      }
    };

    void loadFirstPageAndMarkRead();

    const unsubscribe = subscribeToNotificationStream((event) => {
      if (event.type === ACCOUNT_NOTIFICATION_STREAM_EVENT.created) {
        const row = event.data.notification;
        const visit = applyNotificationVisitUnread(visitUnreadIdsRef.current, [row]);
        visitUnreadIdsRef.current = visit.visitUnreadIds;
        liveRowsRef.current = insertLiveNotificationRow(liveRowsRef.current, row);
        if (pageRef.current === 1) {
          setState((current) => ({
            ...current,
            items: insertLiveNotificationRow(current.items, row),
          }));
        }
        pendingMarkIdsRef.current.add(row.id);
        markLiveRowsRead();
        return;
      }

      if (event.type === ACCOUNT_NOTIFICATION_STREAM_EVENT.resync && pageRef.current === 1) {
        void loadFirstPageAndMarkRead();
      }
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markLiveRowsRead();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      isPageActiveRef.current = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadPage, markLiveRowsRead, subscribeToNotificationStream]);

  const onPageChange = async (page: number) => {
    setIsLoading(true);
    const result = await loadPage(page);
    if (result.status !== 'stale' && result.requestId === listRequestIdRef.current) {
      setIsLoading(false);
    }
  };

  return (
    <>
      <MainHeader title={tNotifications('title')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <FormMaxWidth>
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
                      {state.items.map((row) => (
                        <NotificationRow key={row.id} labels={lineLabels} row={row} />
                      ))}
                    </div>
                  </Pagination>
                ) : null}
              </div>
            </FormMaxWidth>
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );

  function NotificationRow({
    labels,
    row,
  }: {
    labels: AccountNotificationLineLabels;
    row: DTOAccountNotification;
  }) {
    const destination = resolveNotificationDestinationFromPayload({
      ...(row.payload ?? {}),
      link_path: row.link_path,
    });
    const linkPath = destination.kind === 'home' ? ROUTES.NOTIFICATIONS : destination.webPath;
    const line = formatAccountNotificationLine(row, labels);
    const timeLabel = formatRelativeTimeLabel(row.created_at, undefined);

    return (
      <Link className={styles.entry} href={linkPath}>
        {row.is_unread ? (
          <span className={styles.unreadAnnouncer}>{tNotifications('unread')}</span>
        ) : null}
        <span aria-hidden="true" className={styles.unreadSlot}>
          {row.is_unread ? <span className={styles.unreadDot} data-unread="true" /> : null}
        </span>
        <span className={styles.row}>
          <span className={styles.artwork}>
            <Image
              alt=""
              className={styles.image}
              fill
              height={NOTIFICATION_ARTWORK_SOURCE_SIZE}
              src={accountNotificationImageUrl(row.payload)}
              width={NOTIFICATION_ARTWORK_SOURCE_SIZE}
            />
          </span>
          <span className={styles.copy}>
            <span className={styles.line}>{line}</span>
            {timeLabel !== '' ? <span className={styles.timeText}>{timeLabel}</span> : null}
          </span>
        </span>
      </Link>
    );
  }
}
