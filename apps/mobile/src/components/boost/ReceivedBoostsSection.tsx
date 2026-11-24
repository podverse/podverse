import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ListRenderItem } from 'react-native';
import { Pressable, RefreshControl, Text, View } from 'react-native';

import type { DTOItem } from '@podverse/helpers/dto';
import { isMusicMediumId } from '@podverse/helpers/medium';
import type {
  BoostEligibilityChannel,
  PublicBoostMessage,
  PublicBoostMessageRow,
  PublicBoostMessagesScopeType,
} from '@podverse/v4v-metaboost';
import { PUBLIC_BOOST_MESSAGES_PAGE_LIMIT, toPublicBoostMessageRow } from '@podverse/v4v-metaboost';

import { useAuth } from '../../auth/AuthProvider';
import { channelItemsRepository } from '../../data/repositories/channelItemsRepository';
import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import { LIST_END_REACHED_THRESHOLD } from '../../lib/pagination/pagedList';
import type { TrackDetailRouteParams } from '../../navigation/trackDetailParams';
import { buildTrackDetailParams } from '../../navigation/trackDetailParams';
import { useOfflineMode } from '../../prefs/offlineMode';
import { screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Card, FillList } from '../primitives';
import { ListEmpty } from '../state/ListEmpty';
import { LoadingSection } from '../state/LoadingSection';
import { usePublicBoostMessagesFetchState } from './useMbrssPublicMessagesCapability';

export type ReceivedBoostsSectionProps = {
  channel: BoostEligibilityChannel | null;
  itemGuid?: string | null;
  scopeType: PublicBoostMessagesScopeType;
  fetchAllowed: boolean;
  listHeader?: ReactNode;
  directoryChannelIdText?: string | null;
  onOpenChannel?: () => void;
  onOpenDirectoryItem?: (item: DTOItem) => void;
  onOpenItem?: (itemGuid: string) => void;
  /** When set, an Add by RSS item label is a link only if this returns true. */
  isItemLink?: (itemGuid: string) => boolean;
  testIDPrefix: string;
};

export type DirectoryBoostItemDestination =
  | { kind: 'episode'; params: { episodeId: string } }
  | { kind: 'track'; params: TrackDetailRouteParams };

/**
 * Episode when the row is live or the channel is not music. Track when the channel medium is music
 * and the row is not live.
 */
export const directoryBoostItemRoute = (
  item: DTOItem,
  mediumId: number | null | undefined
): DirectoryBoostItemDestination => {
  if (item.live_item !== null && item.live_item !== undefined) {
    return { kind: 'episode', params: { episodeId: item.id_text } };
  }
  if (isMusicMediumId(mediumId)) {
    const imageUrl = getItemPrimaryImageUrl(item);
    return {
      kind: 'track',
      params: buildTrackDetailParams({
        previewImageUrl: imageUrl ?? undefined,
        previewTitle: item.title ?? null,
        trackId: item.id_text,
      }),
    };
  }
  return { kind: 'episode', params: { episodeId: item.id_text } };
};

const receivedBoostsStyles = (theme: ThemedStylesTheme) => ({
  amount: {
    ...typography.body,
    color: theme.styles.textPrimary.color,
    flexShrink: 1,
  },
  appName: {
    ...typography.body,
    color: theme.styles.textSecondary.color,
  },
  amountRow: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: theme.tokens.spacing.md,
    justifyContent: 'space-between' as const,
  },
  body: {
    ...typography.prose,
    color: theme.styles.textPrimary.color,
  },
  breadcrumb: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  breadcrumbText: {
    ...typography.body,
    color: theme.styles.textSecondary.color,
  },
  cardStack: {
    gap: theme.tokens.spacing.md,
  },
  date: {
    ...typography.body,
    color: theme.styles.textSecondary.color,
  },
  fill: {
    flex: 1,
  },
  link: {
    ...typography.body,
    color: theme.tokens.text.link,
  },
  listContent: {
    ...screenBodyInsets(theme.tokens.spacing),
    gap: theme.tokens.spacing.lg,
  },
  sender: {
    ...typography.prose,
    color: theme.styles.textPrimary.color,
    fontWeight: '700' as const,
  },
});

const messageAccessibilityLabel = (row: PublicBoostMessageRow): string => {
  const parts = [row.senderName, row.dateLabel, row.amountPrimary, row.body].filter(
    (part): part is string => part !== null && part !== ''
  );
  return parts.join(', ');
};

/**
 * Public boost messages for one channel or item.
 * The chip can appear before this list has a URL. Until the channel is loaded the pane spins.
 * A failed or unpublished list says the messages are unavailable. An empty success says none yet.
 */
export function ReceivedBoostsSection({
  channel,
  directoryChannelIdText,
  fetchAllowed,
  isItemLink,
  itemGuid,
  listHeader,
  onOpenChannel,
  onOpenDirectoryItem,
  onOpenItem,
  scopeType,
  testIDPrefix,
}: ReceivedBoostsSectionProps) {
  const { i18n, t } = useTranslation();
  const styles = useThemedStyles(receivedBoostsStyles);
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const directoryChannelId = directoryChannelIdText?.trim() ?? '';
  const fetchState = usePublicBoostMessagesFetchState({
    channel,
    fetchAllowed: fetchAllowed && !offlineModeEnabled,
    itemGuid,
    scopeType,
  });
  const { fetcher, status } = fetchState;
  const podcastGuid = channel?.podcast_guid ?? null;
  const requestKey = [
    directoryChannelId,
    podcastGuid ?? '',
    itemGuid ?? '',
    scopeType,
    fetchAllowed ? '1' : '0',
    fetchState.fetcher === null ? '' : 'ready',
    status,
  ].join('\n');
  const [loadedKey, setLoadedKey] = useState(requestKey);
  const [messages, setMessages] = useState<PublicBoostMessage[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [refreshing, setRefreshing] = useState(false);
  const [itemMatches, setItemMatches] = useState<ReadonlyMap<string, DTOItem | null>>(
    () => new Map()
  );
  const generationRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const pendingRef = useRef(new Map<string, true>());
  const channelIdRef = useRef(directoryChannelId);
  const matchGenerationRef = useRef(0);

  if (loadedKey !== requestKey) {
    generationRef.current += 1;
    matchGenerationRef.current += 1;
    loadingMoreRef.current = false;
    pendingRef.current.clear();
    channelIdRef.current = directoryChannelId;
    setLoadedKey(requestKey);
    setMessages([]);
    setPage(0);
    setTotalPages(1);
    setRefreshing(false);
    setItemMatches(new Map());
    setLoadState(fetcher !== null && fetchAllowed && !offlineModeEnabled ? 'loading' : 'idle');
  }

  useEffect(() => {
    if (offlineModeEnabled || fetcher === null || loadState !== 'loading') {
      return;
    }
    const generation = generationRef.current;
    let cancelled = false;
    void fetcher({ limit: PUBLIC_BOOST_MESSAGES_PAGE_LIMIT, page: 1 })
      .then((result) => {
        if (cancelled || generationRef.current !== generation) {
          return;
        }
        setMessages(result.messages);
        setPage(result.page);
        setTotalPages(Math.max(result.page, result.totalPages));
        setLoadState('ready');
      })
      .catch(() => {
        if (cancelled || generationRef.current !== generation) {
          return;
        }
        setMessages([]);
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, loadState, offlineModeEnabled]);

  const rows = useMemo(
    () =>
      messages.map((message) =>
        toPublicBoostMessageRow(message, {
          anonymousLabel: t('misc.anonymous'),
          btcNonSatoshiSuffix: t('value.boost_messages.public_amount_btc_token'),
          currentPodcastGuid: podcastGuid,
          headingFallback: t('value.boost'),
          locale: i18n.language,
          satoshisDenominationLabel: t('value.types.lightning.denomination'),
        })
      ),
    [i18n.language, messages, podcastGuid, t]
  );

  const itemGuids = useMemo(() => {
    if (directoryChannelId === '') {
      return [];
    }
    const seen = new Set<string>();
    for (const row of rows) {
      const target = row.breadcrumb?.target;
      if (target?.kind === 'item' && !seen.has(target.itemGuid)) {
        seen.add(target.itemGuid);
      }
    }
    return [...seen];
  }, [directoryChannelId, rows]);

  useEffect(() => {
    if (directoryChannelId === '' || offlineModeEnabled) {
      return;
    }
    const channelId = directoryChannelId;
    const matchGeneration = matchGenerationRef.current;
    for (const guid of itemGuids) {
      if (itemMatches.has(guid) || pendingRef.current.has(guid)) {
        continue;
      }
      pendingRef.current.set(guid, true);
      void channelItemsRepository
        .findByGuid(channelId, guid, { accessToken, clearSession, refreshToken, setTokens })
        .then(
          (item) => {
            pendingRef.current.delete(guid);
            if (
              channelIdRef.current !== channelId ||
              matchGenerationRef.current !== matchGeneration
            ) {
              return;
            }
            setItemMatches((current) => {
              const next = new Map(current);
              next.set(guid, item);
              return next;
            });
          },
          () => {
            pendingRef.current.delete(guid);
            if (
              channelIdRef.current !== channelId ||
              matchGenerationRef.current !== matchGeneration
            ) {
              return;
            }
            setItemMatches((current) => {
              const next = new Map(current);
              next.set(guid, null);
              return next;
            });
          }
        );
    }
  }, [
    accessToken,
    clearSession,
    directoryChannelId,
    itemGuids,
    itemMatches,
    offlineModeEnabled,
    refreshToken,
    setTokens,
  ]);

  const onRefresh = useCallback(() => {
    if (fetcher === null || offlineModeEnabled) {
      return;
    }
    const generation = generationRef.current;
    matchGenerationRef.current += 1;
    pendingRef.current.clear();
    setItemMatches(new Map());
    setRefreshing(true);
    void fetcher({ limit: PUBLIC_BOOST_MESSAGES_PAGE_LIMIT, page: 1 })
      .then((result) => {
        if (generationRef.current !== generation) {
          return;
        }
        setMessages(result.messages);
        setPage(result.page);
        setTotalPages(Math.max(result.page, result.totalPages));
        setLoadState('ready');
      })
      .catch(() => {
        if (generationRef.current !== generation) {
          return;
        }
        setMessages([]);
        setLoadState('error');
      })
      .finally(() => {
        if (generationRef.current === generation) {
          setRefreshing(false);
        }
      });
  }, [fetcher, offlineModeEnabled]);

  const loadMore = useCallback(() => {
    if (
      fetcher === null ||
      loadState !== 'ready' ||
      page >= totalPages ||
      loadingMoreRef.current ||
      refreshing
    ) {
      return;
    }
    const generation = generationRef.current;
    const nextPage = page + 1;
    loadingMoreRef.current = true;
    void fetcher({ limit: PUBLIC_BOOST_MESSAGES_PAGE_LIMIT, page: nextPage })
      .then((result) => {
        if (generationRef.current !== generation) {
          return;
        }
        setMessages((current) => [...current, ...result.messages]);
        setPage(result.page);
        setTotalPages(Math.max(result.page, result.totalPages));
      })
      .catch(() => {
        // A later page that fails keeps the rows already shown.
      })
      .finally(() => {
        loadingMoreRef.current = false;
      });
  }, [fetcher, loadState, page, refreshing, totalPages]);

  const renderRow = useCallback<ListRenderItem<PublicBoostMessageRow>>(
    ({ item: row }) => {
      const breadcrumb = row.breadcrumb;
      const directoryItem =
        breadcrumb?.target.kind === 'item'
          ? itemMatches.get(breadcrumb.target.itemGuid)
          : undefined;
      const directoryLinkItem =
        directoryChannelId !== '' && directoryItem !== undefined && directoryItem !== null
          ? directoryItem
          : null;
      const channelIsLink = breadcrumb?.target.kind === 'channel' && onOpenChannel !== undefined;
      const addByRssGuid =
        directoryChannelId === '' && breadcrumb?.target.kind === 'item'
          ? breadcrumb.target.itemGuid
          : null;
      const addByRssIsLink =
        addByRssGuid !== null &&
        breadcrumb?.itemLabel !== null &&
        breadcrumb?.itemLabel !== undefined &&
        onOpenItem !== undefined &&
        (isItemLink === undefined || isItemLink(addByRssGuid));

      return (
        <Card testID={`${testIDPrefix}-row-${row.key}`}>
          <View style={styles.cardStack}>
            <View accessible accessibilityLabel={messageAccessibilityLabel(row)}>
              <Text style={styles.sender}>{row.senderName}</Text>
              <Text style={styles.date}>{row.dateLabel}</Text>
              {row.showAmountRow ? (
                <View style={styles.amountRow}>
                  <Text style={styles.amount}>{row.amountPrimary}</Text>
                  {row.appName !== null ? <Text style={styles.appName}>{row.appName}</Text> : null}
                </View>
              ) : null}
              {row.body !== null ? <Text style={styles.body}>{row.body}</Text> : null}
            </View>
            {breadcrumb !== null ? (
              <View style={styles.breadcrumb}>
                {channelIsLink ? (
                  <Pressable
                    accessibilityLabel={breadcrumb.podcastLabel}
                    accessibilityRole="link"
                    onPress={onOpenChannel}
                  >
                    <Text style={styles.link}>{breadcrumb.podcastLabel}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.breadcrumbText}>{breadcrumb.podcastLabel}</Text>
                )}
                {breadcrumb.itemLabel !== null ? (
                  <>
                    <Text style={styles.breadcrumbText}> / </Text>
                    {directoryLinkItem !== null && onOpenDirectoryItem !== undefined ? (
                      <Pressable
                        accessibilityLabel={breadcrumb.itemLabel}
                        accessibilityRole="link"
                        onPress={() => {
                          onOpenDirectoryItem(directoryLinkItem);
                        }}
                      >
                        <Text style={styles.link}>{breadcrumb.itemLabel}</Text>
                      </Pressable>
                    ) : addByRssIsLink && addByRssGuid !== null && onOpenItem !== undefined ? (
                      <Pressable
                        accessibilityLabel={breadcrumb.itemLabel}
                        accessibilityRole="link"
                        onPress={() => {
                          onOpenItem(addByRssGuid);
                        }}
                      >
                        <Text style={styles.link}>{breadcrumb.itemLabel}</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.breadcrumbText}>{breadcrumb.itemLabel}</Text>
                    )}
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
        </Card>
      );
    },
    [
      directoryChannelId,
      isItemLink,
      itemMatches,
      onOpenChannel,
      onOpenDirectoryItem,
      onOpenItem,
      styles,
      testIDPrefix,
    ]
  );

  if (offlineModeEnabled) {
    return (
      <View style={styles.fill}>
        {listHeader}
        <ListEmpty
          messageKey="settings.offline_mode.unavailable"
          testID={`${testIDPrefix}-error`}
        />
      </View>
    );
  }

  const showLoading =
    !fetchAllowed ||
    (fetcher === null && status === 'loading') ||
    (fetcher !== null && loadState === 'loading' && messages.length === 0);
  if (showLoading) {
    return (
      <View style={styles.fill}>
        {listHeader}
        <LoadingSection testID={`${testIDPrefix}-loading`} />
      </View>
    );
  }

  if (fetcher === null || loadState === 'error') {
    return (
      <View style={styles.fill}>
        {listHeader}
        <ListEmpty
          messageKey="value.boost_messages.public_messages_unavailable"
          testID={`${testIDPrefix}-error`}
        />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.fill}>
        {listHeader}
        <ListEmpty
          messageKey="value.boost_messages.public_messages_empty"
          testID={`${testIDPrefix}-empty`}
        />
      </View>
    );
  }

  return (
    <FillList
      contentContainerStyle={styles.listContent}
      data={rows}
      keyExtractor={(row) => row.key}
      ListHeaderComponent={
        listHeader !== null && listHeader !== undefined ? <>{listHeader}</> : null
      }
      onEndReached={loadMore}
      onEndReachedThreshold={LIST_END_REACHED_THRESHOLD}
      refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} />}
      renderItem={renderRow}
      style={styles.fill}
      testID={`${testIDPrefix}-list`}
    />
  );
}
