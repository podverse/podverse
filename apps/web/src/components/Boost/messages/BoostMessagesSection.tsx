'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useRef } from 'react';

import type { PublicBoostMessagesPageFetcher } from '@podverse/v4v-metaboost';
import { PUBLIC_BOOST_MESSAGES_PAGE_LIMIT, toPublicBoostMessageRow } from '@podverse/v4v-metaboost';

import { WebLoadingSpinnerDecorativeSmall } from '../../LoadingSpinner/WebLoadingSpinnerDecorative';
import { NoResults } from '../../NoResults/NoResults';
import { Pagination } from '../../Pagination/Pagination';
import type { BoostBreadcrumbLinkResolver } from './types';
import { useBoostMessagesSection } from './useBoostMessagesSection';

import styles from './BoostMessagesSection.module.scss';

type BoostMessagesSectionProps = {
  heading: string;
  pageFetcher: PublicBoostMessagesPageFetcher;
  initialPage?: number;
  limit?: number;
  breadcrumbLinkResolver?: BoostBreadcrumbLinkResolver;
  className?: string;
  refreshTrigger?: number;
};

const getContainerScrollTopForSection = (sectionEl: HTMLElement): number | null => {
  const containerEl = document.getElementById('mainOuterWrapper');
  if (containerEl === null) {
    return null;
  }
  const sectionBounds = sectionEl.getBoundingClientRect();
  const containerBounds = containerEl.getBoundingClientRect();
  const nextTop = containerEl.scrollTop + (sectionBounds.top - containerBounds.top);
  return nextTop;
};

export const BoostMessagesSection: React.FC<BoostMessagesSectionProps> = ({
  heading,
  pageFetcher,
  initialPage = 1,
  limit = PUBLIC_BOOST_MESSAGES_PAGE_LIMIT,
  breadcrumbLinkResolver,
  className = '',
  refreshTrigger = 0,
}) => {
  const tBoost = useTranslations('value.boost_messages');
  const tValue = useTranslations('value');
  const tMisc = useTranslations('misc');
  const locale = useLocale();
  const sectionRef = useRef<HTMLElement>(null);

  const { status, page, setPage, data, messageLinkMap } = useBoostMessagesSection({
    pageFetcher,
    initialPage,
    limit,
    breadcrumbLinkResolver,
    refreshTrigger,
  });

  const loadingLabel = useMemo(() => tBoost('public_messages_loading'), [tBoost]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage === page) {
      return;
    }
    setPage(nextPage);
    requestAnimationFrame(() => {
      if (sectionRef.current === null) {
        return;
      }
      const nextTop = getContainerScrollTopForSection(sectionRef.current);
      if (nextTop !== null) {
        const containerEl = document.getElementById('mainOuterWrapper');
        containerEl?.scrollTo({ top: nextTop });
        return;
      }
      sectionRef.current.scrollIntoView({ block: 'start' });
    });
  };

  return (
    <section ref={sectionRef} className={`${styles.section} ${className}`.trim()}>
      <h2 className={styles.heading}>{heading}</h2>

      {status === 'loading' && (
        <div className={styles.loadingContainer}>
          <WebLoadingSpinnerDecorativeSmall />
          <span>{loadingLabel}</span>
        </div>
      )}

      {status === 'error' && (
        <p className={styles.statusMessage}>{tBoost('public_messages_unavailable')}</p>
      )}

      {status === 'success' && data.messages.length === 0 && (
        <NoResults message={tBoost('public_messages_empty')} role="status" />
      )}

      {status === 'success' && data.messages.length > 0 && (
        <Pagination currentPage={page} totalPages={data.totalPages} setPage={handlePageChange}>
          <div className={styles.messageList}>
            {data.messages.map((message) => {
              const row = toPublicBoostMessageRow(message, {
                locale,
                anonymousLabel: tMisc('anonymous'),
                headingFallback: heading,
                currentPodcastGuid: null,
                satoshisDenominationLabel: tValue('types.lightning.denomination'),
                btcNonSatoshiSuffix: tBoost('public_amount_btc_token'),
              });
              const href = messageLinkMap[row.key] ?? null;
              const itemHref = href !== null && href !== '' ? href : null;
              const breadcrumb = row.breadcrumb;

              return (
                <article key={message.id} className={styles.messageCard}>
                  {message.breadcrumbContext?.isSubBucket === true && breadcrumb !== null && (
                    <div className={styles.breadcrumbRow}>
                      <span className={styles.breadcrumbLabel}>{breadcrumb.podcastLabel}</span>
                      {breadcrumb.itemLabel !== null && (
                        <>
                          <span className={styles.breadcrumbSeparator}>/</span>
                          {itemHref !== null ? (
                            <Link href={itemHref} className={styles.breadcrumbLink}>
                              {breadcrumb.itemLabel}
                            </Link>
                          ) : (
                            <span className={styles.breadcrumbLabel}>{breadcrumb.itemLabel}</span>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className={styles.headerRow}>
                    <span className={styles.senderName}>{row.senderName}</span>
                    <time className={styles.dateAt} dateTime={row.createdAt}>
                      {row.dateLabel}
                    </time>
                  </div>
                  {row.showAmountRow && (
                    <div className={styles.amountRow}>
                      <span className={styles.amountLinePrimary}>{row.amountPrimary}</span>
                      {row.appName !== null && (
                        <span className={styles.amountLineApp}>{row.appName}</span>
                      )}
                    </div>
                  )}

                  {row.body !== null && <p className={styles.messageBody}>{row.body}</p>}
                </article>
              );
            })}
          </div>
        </Pagination>
      )}
    </section>
  );
};
