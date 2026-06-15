'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LoadingSpinner } from '@podverse/ui';

import { EmbedShellPlaybackModeProvider } from '../../contexts/EmbedPlaybackMode';
import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useEmbedPlaybackLoad } from '../../hooks/useEmbedPlaybackLoad';
import { useEmbedTallAutoResize } from '../../hooks/useEmbedTallAutoResize';
import { getEmbedListVideoPlaceholderHeightPx } from '../../lib/embed/embedLayoutDimensions';
import { registerEmbedListEndedHandler } from '../../lib/embed/embedListPlaybackAdvance';
import type {
  EmbedAlbumListQueryParams,
  EmbedEpisodeChaptersListQueryParams,
  EmbedListData,
  EmbedListGroup,
  EmbedListRow as EmbedListRowType,
} from '../../lib/embed/embedListTypes';
import type {
  EmbedPlaylistListQueryParams,
  EmbedPodcastListQueryParams,
  EmbedPresentationQuery,
  EmbedSharedQueryParams,
} from '../../lib/embed/embedTypes';
import {
  fetchEmbedListPageClient,
  mergeEmbedListGroups,
} from '../../lib/embed/fetchEmbedListPageClient';
import {
  flattenEmbedListRows,
  resolveEmbedListDefaultRow,
} from '../../lib/embed/resolveEmbedListDefaultRow';
import {
  listHasMixedEmbedMedia,
  resolveInitialPresentationStyle,
} from '../../lib/embed/resolveEmbedListPresentationStyle';
import { resolveEffectiveEmbedListPlayerSize } from '../../lib/embed/resolvePlayerSizeFromPresentation';
import { EmbedListRow } from './EmbedListRow';
import { EmbedPlayerPanel } from './EmbedPlayerPanel';
import { EmbedPresentationStyleSelector } from './EmbedPresentationStyleSelector';

import groupStyles from '../../styles/components/embed/EmbedListRow.module.scss';
import styles from '../../styles/components/embed/EmbedListShell.module.scss';

type EmbedListShellProps = {
  listData: EmbedListData;
  sharedQuery: EmbedSharedQueryParams;
  playIdText: string | null;
  listQuery:
    | EmbedPodcastListQueryParams
    | EmbedAlbumListQueryParams
    | EmbedPlaylistListQueryParams
    | EmbedEpisodeChaptersListQueryParams;
};

export function EmbedListShell({
  listData,
  sharedQuery,
  playIdText,
  listQuery,
}: EmbedListShellProps) {
  const [groups, setGroups] = useState<EmbedListGroup[]>(listData.groups);
  const [pagination, setPagination] = useState(listData.pagination);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const allRows = useMemo(() => flattenEmbedListRows(groups), [groups]);
  const lastRowKey = allRows.at(-1)?.rowKey ?? null;
  const initialRow = useMemo(
    () => resolveEmbedListDefaultRow(allRows, playIdText),
    [allRows, playIdText]
  );
  const hasMixedMedia = useMemo(() => listHasMixedEmbedMedia(allRows), [allRows]);
  const { playerSize, playerSizeLocked, presentationLocked } = sharedQuery;

  const [selectedRow, setSelectedRow] = useState<EmbedListRowType | null>(initialRow);
  const [mediaPreference, setMediaPreference] = useState<EmbedPresentationQuery>(() => {
    if (presentationLocked) {
      return sharedQuery.presentation;
    }

    return resolveInitialPresentationStyle(initialRow);
  });
  const effectivePlayerSize = resolveEffectiveEmbedListPlayerSize({
    playerSize,
    playerSizeLocked,
    mediaPreference,
  });
  const isTallPlayer = effectivePlayerSize === 'tall';
  const [playbackStartSeconds, setPlaybackStartSeconds] = useState(sharedQuery.startSeconds);
  const [shouldPlay, setShouldPlay] = useState(false);
  const { mpIsPlaying, setMPIsPlaying } = useMediaPlayer();

  useEffect(() => {
    if (presentationLocked) {
      setMediaPreference(sharedQuery.presentation);
      return;
    }

    if (!hasMixedMedia) {
      setMediaPreference(resolveInitialPresentationStyle(selectedRow));
    }
  }, [hasMixedMedia, presentationLocked, selectedRow, sharedQuery.presentation]);

  useEmbedPlaybackLoad({
    resource: selectedRow,
    shouldPlay,
    startSeconds: playbackStartSeconds,
    enabled: selectedRow !== null,
    embedMediaType: mediaPreference,
  });

  const handleRowSelect = useCallback(
    (row: EmbedListRowType) => {
      if (selectedRow?.rowKey === row.rowKey) {
        setMPIsPlaying(!mpIsPlaying);
        setShouldPlay(!mpIsPlaying);
        return;
      }

      setSelectedRow(row);
      if (!presentationLocked) {
        setMediaPreference(resolveInitialPresentationStyle(row));
      }
      setPlaybackStartSeconds(0);
      setShouldPlay(true);
    },
    [mpIsPlaying, presentationLocked, selectedRow?.rowKey, setMPIsPlaying]
  );

  const loadNextPage = useCallback(
    async (autoplayFirstNewRow: boolean) => {
      if (!pagination.hasNextPage || isLoadingMore) {
        return;
      }

      setIsLoadingMore(true);
      const nextPage = pagination.page + 1;
      const nextListQuery = { ...listQuery, page: nextPage };

      try {
        const nextPageData = await fetchEmbedListPageClient({
          routeKind: listData.routeKind,
          resourceId: listData.resourceId,
          headerTitle: listData.headerTitle,
          listQuery: nextListQuery,
        } as Parameters<typeof fetchEmbedListPageClient>[0]);

        if (nextPageData === null) {
          return;
        }

        setGroups((current) => mergeEmbedListGroups(current, nextPageData.groups));
        setPagination(nextPageData.pagination);

        if (autoplayFirstNewRow) {
          const appendedRows = flattenEmbedListRows(nextPageData.groups);
          const firstNewRow = appendedRows[0] ?? null;
          if (firstNewRow) {
            setSelectedRow(firstNewRow);
            if (!presentationLocked) {
              setMediaPreference(resolveInitialPresentationStyle(firstNewRow));
            }
            setPlaybackStartSeconds(0);
            setShouldPlay(true);
          }
        }
      } finally {
        setIsLoadingMore(false);
      }
    },
    [
      presentationLocked,
      isLoadingMore,
      listData.headerTitle,
      listData.resourceId,
      listData.routeKind,
      listQuery,
      pagination.hasNextPage,
      pagination.page,
    ]
  );

  const advanceToNextRow = useCallback(() => {
    if (!shouldPlay || selectedRow === null) {
      return;
    }

    const currentIndex = allRows.findIndex((row) => row.rowKey === selectedRow.rowKey);
    const nextRow = currentIndex >= 0 ? allRows[currentIndex + 1] : null;

    if (nextRow) {
      setSelectedRow(nextRow);
      if (!presentationLocked) {
        setMediaPreference(resolveInitialPresentationStyle(nextRow));
      }
      setPlaybackStartSeconds(0);
      setShouldPlay(true);
      return;
    }

    if (pagination.hasNextPage && !isLoadingMore) {
      void loadNextPage(true);
    }
  }, [
    allRows,
    isLoadingMore,
    loadNextPage,
    presentationLocked,
    pagination.hasNextPage,
    selectedRow,
    shouldPlay,
  ]);

  useEffect(() => {
    registerEmbedListEndedHandler(advanceToNextRow);
    return () => {
      registerEmbedListEndedHandler(null);
    };
  }, [advanceToNextRow]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !pagination.hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          void loadNextPage(false);
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [loadNextPage, pagination.hasNextPage]);

  const selectedResource = selectedRow
    ? {
        channel: selectedRow.channel,
        item: selectedRow.item,
        clip: selectedRow.clip,
        itemChapter: selectedRow.itemChapter,
        itemSoundbite: selectedRow.itemSoundbite,
      }
    : null;

  const autoResizeEnabled = isTallPlayer && listQuery.autoResize === true;
  const shellClassName = isTallPlayer
    ? `${styles.shell} ${styles.shellTall} ${
        autoResizeEnabled ? styles.shellTallAutoResize : styles.shellTallFixed
      }`
    : styles.shell;

  const showPresentationSelector = hasMixedMedia && !presentationLocked;
  useEmbedTallAutoResize({ enabled: autoResizeEnabled });
  const shellStyle = {
    '--embed-has-presentation-selector': showPresentationSelector ? 1 : 0,
    '--embed-list-visible-rows': String(listQuery.listVisibleRows),
    '--embed-list-video-placeholder-height': `${getEmbedListVideoPlaceholderHeightPx(sharedQuery.aspectRatio)}px`,
  } as CSSProperties;

  return (
    <EmbedShellPlaybackModeProvider playerSize={effectivePlayerSize}>
      <section className={shellClassName} data-testid="embed-list-shell" style={shellStyle}>
        <EmbedPlayerPanel
          fallbackResource={selectedResource}
          headerTitle={listData.headerTitle}
          listTallAutoResize={autoResizeEnabled}
          panelLayout="list"
          playerSize={effectivePlayerSize}
          sharedQuery={sharedQuery}
        />
        {showPresentationSelector ? (
          <EmbedPresentationStyleSelector onChange={setMediaPreference} value={mediaPreference} />
        ) : null}
        <div className={styles.listRegion} data-testid="embed-list-region">
          {groups.map((group) => (
            <div className={styles.listGroup} key={group.groupKey}>
              {group.title ? <div className={groupStyles.groupTitle}>{group.title}</div> : null}
              {group.rows.map((row) => (
                <EmbedListRow
                  key={row.rowKey}
                  isActive={selectedRow?.rowKey === row.rowKey}
                  isLastRow={row.rowKey === lastRowKey}
                  onSelect={() => handleRowSelect(row)}
                  row={row}
                />
              ))}
            </div>
          ))}
          {pagination.hasNextPage ? (
            <div
              className={styles.loadMoreSentinel}
              data-testid="embed-list-load-more"
              ref={loadMoreSentinelRef}
            >
              {isLoadingMore ? (
                <LoadingSpinner ariaLabel="Loading more items" size="small" />
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </EmbedShellPlaybackModeProvider>
  );
}
