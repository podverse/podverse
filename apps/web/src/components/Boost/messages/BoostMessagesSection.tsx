'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useRef } from 'react';

import { formatDateTimeAbbrev } from '@podverse/helpers';
import type { PublicBoostMessage } from '@podverse/v4v-metaboost';

import LoadingSpinner from '../../LoadingSpinner/LoadingSpinner';
import Pagination from '../../Pagination/Pagination';
import { formatPublicBoostAmountLine } from './formatPublicBoostAmountLine';
import type { BoostBreadcrumbLinkResolver, BoostMessagesPageFetcher } from './types';
import { useBoostMessagesSection } from './useBoostMessagesSection';

import styles from './BoostMessagesSection.module.scss';

type BoostMessagesSectionProps = {
  heading: string;
  pageFetcher: BoostMessagesPageFetcher;
  initialPage?: number;
  limit?: number;
  breadcrumbLinkResolver?: BoostBreadcrumbLinkResolver;
  className?: string;
};

const getMessageLinkKey = (message: PublicBoostMessage): string =>
  message.messageGuid || message.id;

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
  limit = 20,
  breadcrumbLinkResolver,
  className = '',
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
  });

  const loadingLabel = useMemo(() => tBoost('public_messages_loading'), [tBoost]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage === page) {
      return;
    }
    setPage(nextPage);
    requestAnimationFrame(() => {
      const sectionEl = sectionRef.current;
      if (sectionEl === null) {
        return;
      }
      const nextTop = getContainerScrollTopForSection(sectionEl);
      if (nextTop !== null) {
        const containerEl = document.getElementById('mainOuterWrapper');
        containerEl?.scrollTo({ top: nextTop });
        return;
      }
      sectionEl.scrollIntoView({ block: 'start' });
    });
  };

  return (
    <section ref={sectionRef} className={`${styles.section} ${className}`.trim()}>
      <h2 className={styles.heading}>{heading}</h2>

      {status === 'loading' && (
        <div className={styles.loadingContainer}>
          <LoadingSpinner size="small" />
          <span>{loadingLabel}</span>
        </div>
      )}

      {status === 'error' && (
        <p className={styles.statusMessage}>{tBoost('public_messages_unavailable')}</p>
      )}

      {status === 'success' && data.messages.length === 0 && (
        <p className={styles.statusMessage}>{tBoost('public_messages_empty')}</p>
      )}

      {status === 'success' && data.messages.length > 0 && (
        <Pagination currentPage={page} totalPages={data.totalPages} setPage={handlePageChange}>
          <div className={styles.messageList}>
            {data.messages.map((message) => {
              const breadcrumb = message.breadcrumbContext;
              const key = getMessageLinkKey(message);
              const href = messageLinkMap[key] ?? null;
              const displaySender =
                message.senderName !== null && message.senderName.trim() !== ''
                  ? message.senderName
                  : tMisc('anonymous');
              const dateLabel = formatDateTimeAbbrev(message.createdAt, locale);
              const amountLine = formatPublicBoostAmountLine(message, locale, {
                satoshisDenominationLabel: tValue('types.lightning.denomination'),
                btcNonSatoshiSuffix: tBoost('public_amount_btc_token'),
              });
              const hasAppName = message.appName.trim() !== '';
              const showAmountRow = amountLine !== null || hasAppName;

              return (
                <article key={message.id} className={styles.messageCard}>
                  {breadcrumb?.isSubBucket === true && (
                    <div className={styles.breadcrumbRow}>
                      <span className={styles.breadcrumbLabel}>
                        {breadcrumb.podcastLabel ?? heading}
                      </span>
                      {breadcrumb.itemLabel && (
                        <>
                          <span className={styles.breadcrumbSeparator}>/</span>
                          {href ? (
                            <Link href={href} className={styles.breadcrumbLink}>
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
                    <span className={styles.senderName}>{displaySender}</span>
                    <time className={styles.dateAt} dateTime={message.createdAt}>
                      {dateLabel}
                    </time>
                  </div>
                  {showAmountRow && (
                    <div className={styles.amountRow}>
                      <span className={styles.amountLinePrimary}>{amountLine ?? '\u2014'}</span>
                      {hasAppName && (
                        <span className={styles.amountLineApp}>{message.appName}</span>
                      )}
                    </div>
                  )}

                  {message.body && <p className={styles.messageBody}>{message.body}</p>}
                </article>
              );
            })}
          </div>
        </Pagination>
      )}
    </section>
  );
};
