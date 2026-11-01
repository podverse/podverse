'use client';

import classNames from 'classnames';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useEffect, useOptimistic, useTransition } from 'react';

import { ChipRow, ChipRowWithActions } from '@podverse/ui';

import type { MediaListChip, MediaListChipsPage } from '../../utils/mediaListChips';
import {
  buildMediaListChipPath,
  MEDIA_LIST_CHIP_LABEL_KEYS,
  writeMediaListChip,
} from '../../utils/mediaListChips';
import { MediaListLoadingSpinner } from './MediaListLoadingSpinner';
import { MediaListPendingTrailingChips } from './MediaListPendingTrailingChips';

import styles from '../../styles/components/MediaListChips/MediaListChips.module.scss';

/** What a server page knows about the chip row. Serializable; a client adds `trailing`. */
export type MediaListChipsConfig = {
  page: MediaListChipsPage;
  chips: readonly MediaListChip[];
  selected: MediaListChip;
  urlChip: MediaListChip | null;
};

type MediaListChipsProps = MediaListChipsConfig & {
  /**
   * Controls after the media chips, in this order: Category (Browse only, where it applies),
   * Sort, then the gear. Mount each only when the selected chip can use it.
   */
  trailing?: ReactNode;
  /**
   * Page actions ahead of the chips. They share the chip row when the line is wide enough, and
   * sit above it, aligned to the start, when it is not.
   */
  actions?: ReactNode;
  /** Marks the actions group for tests. */
  actionsTestId?: string;
};

/**
 * Media chips for Subscribed, Browse, Add by RSS, and Recommendations. The pressed chip follows
 * the click at once. Everything after the row in its column is the list area, hidden behind one
 * spinner until the new chip's render commits. While that spinner is up, the trailing slot shows
 * Sort and the gear for the pressed chip. The row keeps its horizontal offset and focus across
 * that render. The last chip clicked wins.
 */
export function MediaListChips({
  page,
  chips,
  selected,
  urlChip,
  trailing,
  actions,
  actionsTestId,
}: MediaListChipsProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [shownChip, setShownChip] = useOptimistic(selected);

  useEffect(() => {
    // A chip named in the URL is remembered once, when this row mounts.
    if (urlChip !== null) {
      writeMediaListChip(page, urlChip);
    }
  }, []);

  const onSelect = (chip: MediaListChip) => {
    if (chip === shownChip) {
      return;
    }
    writeMediaListChip(page, chip);
    const path = buildMediaListChipPath(page, chip);
    const current = `${window.location.pathname}${window.location.search}`;
    startTransition(() => {
      setShownChip(chip);
      // The address updates when a chip's render commits. Until then, replace the in-flight
      // navigation, including when the path is the address already shown. A refresh waits behind
      // that navigation.
      if (path === current && !isPending) {
        router.refresh();
        return;
      }
      router.replace(path, { scroll: false });
    });
  };

  const showPendingTrailing = isPending && shownChip !== selected;
  const rowTrailing = showPendingTrailing ? (
    <MediaListPendingTrailingChips chip={shownChip} page={page} />
  ) : (
    trailing
  );

  const hasActions = typeof actions !== 'boolean' && actions !== undefined && actions !== null;
  const chipRow = (
    <ChipRow
      className={classNames(
        !hasActions && styles.chipRow,
        !hasActions && isPending && styles.chipRowPending
      )}
      items={chips.map((chip) => ({ key: chip, label: t(MEDIA_LIST_CHIP_LABEL_KEYS[chip]) }))}
      memoryKey={`media-list-chips-${page}`}
      onSelect={onSelect}
      selectedKey={shownChip}
      testId="media-list-chips"
      trailing={rowTrailing}
    />
  );

  return (
    <>
      {hasActions ? (
        <ChipRowWithActions
          actions={actions}
          actionsTestId={actionsTestId}
          className={classNames(styles.chipRow, isPending && styles.chipRowPending)}
        >
          {chipRow}
        </ChipRowWithActions>
      ) : (
        chipRow
      )}
      {isPending ? <MediaListLoadingSpinner className={styles.pendingLoading} /> : null}
    </>
  );
}
