import type { ReactElement, ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, StyleSheet, Text } from 'react-native';

import { FillList, VerticalCenter } from '../../../components/primitives';
import { ListEmpty } from '../../../components/state/ListEmpty';
import { ListError } from '../../../components/state/ListError';
import { LoadingSection } from '../../../components/state/LoadingSection';
import { screenBodyInsets } from '../../../theme/screenLayout';
import { useTheme } from '../../../theme/useTheme';

export type PodcastSectionListProps<TRow> = {
  /** Read by a screen reader as the name of the list itself. */
  accessibilityLabel?: string;
  /** Said when the section has nothing at all — never reused for a filter that matched nothing. */
  emptyMessageKey: string;
  errorKey: string | null;
  /** The section has rows, but the active filter hides every one of them. */
  hasFilterHiddenEverything?: boolean;
  hasMore?: boolean;
  isInitialLoading: boolean;
  isLoadingMore?: boolean;
  isRefreshing?: boolean;
  keyExtractor: (row: TRow) => string;
  /** The identity block and controls, which belong inside the list so they scroll with the rows. */
  listHeader: ReactNode;
  /** A passing remark under the list, already keyed for translation. */
  noticeKey?: string | null;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onRetry: () => void;
  renderRow: (params: { index: number; isLast: boolean; row: TRow }) => ReactElement;
  /** Already filtered, in the order the section settled on. */
  rows: TRow[];
  /** Prefix for the loading / error / empty / load-more testIDs. Defaults to `testID`. */
  statusTestIDPrefix?: string;
  testID: string;
};

/**
 * The list every podcast section is drawn as.
 *
 * The sections answer to different endpoints and different row shapes, but they share their chrome:
 * one virtualized list, the identity block as its header, and the same four things to say when there
 * are no rows to show. Holding that in one place is what keeps a section switch feeling like the same
 * screen changing its contents rather than five screens taking turns.
 *
 * A failure while reaching further does not discard what is already on screen: the message goes below
 * the rows, because the rows are still true and the reader was looking at them.
 */
export function PodcastSectionList<TRow>({
  accessibilityLabel,
  emptyMessageKey,
  errorKey,
  hasFilterHiddenEverything = false,
  hasMore = false,
  isInitialLoading,
  isLoadingMore = false,
  isRefreshing = false,
  keyExtractor,
  listHeader,
  noticeKey,
  onLoadMore,
  onRefresh,
  onRetry,
  renderRow,
  rows,
  statusTestIDPrefix,
  testID,
}: PodcastSectionListProps<TRow>) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          ...screenBodyInsets(tokens.spacing),
          paddingBottom: tokens.spacing['2xl'],
        },
        list: {
          backgroundColor: themeStyles.screen.backgroundColor,
        },
        loadMore: {
          marginTop: tokens.spacing.md,
        },
        loadMoreLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          fontWeight: '600',
        },
        statusNotice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  const prefix = statusTestIDPrefix ?? testID;
  const showBlockingError = errorKey !== null && rows.length === 0;
  const isSettled = !isInitialLoading && !showBlockingError;
  const listData = isSettled ? rows : [];

  // Two empty lists, two different problems. Nothing here is answered by a refresh; nothing matching
  // is answered by editing the term, and the two must not be worded the same way.
  const showNoFilterMatches = isSettled && hasFilterHiddenEverything;
  const showEmpty = isSettled && !hasFilterHiddenEverything && rows.length === 0;
  const refreshControl =
    onRefresh === undefined ? undefined : (
      <RefreshControl
        onRefresh={onRefresh}
        refreshing={isRefreshing}
        tintColor={themeStyles.buttonPrimary.backgroundColor}
      />
    );

  const listStatus = (
    <>
      {isInitialLoading ? <LoadingSection testID={`${prefix}-loading`} /> : null}
      {showBlockingError && !isInitialLoading ? (
        <VerticalCenter>
          <ListError messageKey={errorKey} onRetry={onRetry} testID={`${prefix}-error`} />
        </VerticalCenter>
      ) : null}
      {showNoFilterMatches ? (
        <ListEmpty messageKey="filters.list.no_matches" testID={`${prefix}-no-filter-matches`} />
      ) : null}
      {showEmpty ? <ListEmpty messageKey={emptyMessageKey} testID={`${prefix}-empty`} /> : null}
    </>
  );

  return (
    <FillList
      ListEmptyComponent={listStatus}
      ListFooterComponent={
        <>
          {isSettled && hasMore && onLoadMore !== undefined ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (isLoadingMore) {
                  return;
                }
                onLoadMore();
              }}
              style={styles.loadMore}
              testID={`${prefix}-load-more`}
            >
              <Text style={styles.loadMoreLabel}>
                {isLoadingMore ? t('misc.loading') : t('info.show_more')}
              </Text>
            </Pressable>
          ) : null}
          {errorKey !== null && rows.length > 0 ? (
            <ListError messageKey={errorKey} onRetry={onRetry} testID={`${prefix}-error`} />
          ) : null}
          {isSettled && noticeKey !== null && noticeKey !== undefined ? (
            <Text style={styles.statusNotice}>{t(noticeKey)}</Text>
          ) : null}
        </>
      }
      ListHeaderComponent={listHeader}
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={styles.content}
      data={listData}
      keyboardShouldPersistTaps="handled"
      keyExtractor={keyExtractor}
      refreshControl={refreshControl}
      renderItem={({ index, item: row }) =>
        renderRow({ index, isLast: index === listData.length - 1, row })
      }
      style={styles.list}
      testID={testID}
    />
  );
}

