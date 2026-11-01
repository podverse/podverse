import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { shouldMountRowMoreMenu } from '../../components/player/rowMoreMenuMount';
import type { MoreMenuSection } from '../../components/primitives';
import {
  Badge,
  CountBadge,
  CoverImage,
  MoreMenu,
  UnseenIndicator,
} from '../../components/primitives';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { HomeFeedRowData } from './homeFeedData';

export type HomeFeedGridCellRemoveAction = {
  /** Already localized. Names the sheet item and the accessibility action. */
  label: string;
  onRemove: (row: HomeFeedRowData) => void | Promise<void>;
};

type HomeFeedGridCellProps = {
  artworkEdge?: number;
  onPress: (row: HomeFeedRowData) => void;
  removeAction?: HomeFeedGridCellRemoveAction;
  row: HomeFeedRowData;
  testID?: string;
};

const createStyles = ({ tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    artwork: {
      // Square so tiles line up on a row whatever each feed's artwork happens to be.
      aspectRatio: 1,
      width: '100%',
    },
    cell: {
      marginBottom: tokens.spacing.md,
    },
    downloadedBadge: {
      bottom: tokens.spacing.xs,
      left: tokens.spacing.xs,
      position: 'absolute',
    },
    // Solid fill: this pill sits on cover art; the translucent danger tone washes out on bright images.
    liveBadge: {
      backgroundColor: tokens.button.dangerBg,
      borderColor: tokens.button.dangerBg,
      position: 'absolute',
      right: tokens.spacing.xs,
      top: tokens.spacing.xs,
    },
    tile: {
      position: 'relative',
      width: '100%',
    },
    unseenIndicator: {
      bottom: tokens.spacing.xs,
      position: 'absolute',
      right: tokens.spacing.xs,
    },
  });

/**
 * One artwork tile in the Home grid.
 *
 * Live sits top-right, unseen is a presence dot bottom-right, and the downloaded count sits
 * bottom-left so the three can show together without stacking. Titles stay off the tile — the
 * list view is where full metadata lives — but each marker folds into the accessible name so a
 * screen reader is not left with blank squares. With `removeAction`, holding the tile opens the
 * bottom sheet with the one action a list row's swipe reveals, plus Cancel.
 */
export const HomeFeedGridCell = memo(function HomeFeedGridCell({
  artworkEdge,
  onPress,
  removeAction,
  row,
  testID,
}: HomeFeedGridCellProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const liveLabel = row.metadata?.isLive === true ? t('media.livestream.live') : null;
  const unseenBadge = row.metadata?.unseenBadge ?? null;
  const unseenLabel = unseenBadge === null ? null : t('subscriptions.row.unseen_indicator_aria');

  const downloadedCount = row.metadata?.downloadedCount ?? 0;
  const downloadedLabel =
    downloadedCount > 0
      ? t('subscriptions.row.downloaded_count', { count: downloadedCount })
      : null;

  const accessibilityLabel = [row.title, liveLabel, unseenLabel, downloadedLabel]
    .filter((part) => part !== null)
    .join(', ');

  const cellTestID = testID ?? `home-feed-cell-${row.id}`;
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [hasOpenedMenu, setHasOpenedMenu] = useState(false);

  const runRemove = useCallback(() => {
    if (removeAction === undefined) {
      return;
    }
    const result = removeAction.onRemove(row);
    if (result instanceof Promise) {
      // The screen shows the failure; the rejection only matters to a swipe row's spinner.
      void result.catch(() => undefined);
    }
  }, [removeAction, row]);

  const openMenu = useCallback(() => {
    setHasOpenedMenu(true);
    setIsMenuVisible(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuVisible(false);
  }, []);

  const menuSections = useMemo<MoreMenuSection[]>(
    () =>
      removeAction === undefined
        ? []
        : [
            {
              items: [
                { key: 'remove', label: removeAction.label, onPress: runRemove, tone: 'danger' },
              ],
              key: 'actions',
            },
          ],
    [removeAction, runRemove]
  );

  return (
    <>
      <Pressable
        accessibilityActions={
          removeAction === undefined ? undefined : [{ label: removeAction.label, name: 'remove' }]
        }
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="imagebutton"
        accessible
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'remove') {
            runRemove();
          }
        }}
        onLongPress={removeAction === undefined ? undefined : openMenu}
        onPress={() => {
          onPress(row);
        }}
        style={styles.cell}
        testID={cellTestID}
      >
        <View style={styles.tile}>
          {/*
            Artwork is decorative here: the Pressable owns the accessible name (title + badges).
          */}
          <CoverImage
            decodeEdge={artworkEdge}
            opensViewer={false}
            style={styles.artwork}
            uri={row.imageUrl}
          />
          {liveLabel !== null ? (
            <Badge
              label={liveLabel}
              style={styles.liveBadge}
              testID={`home-feed-cell-live-${row.id}`}
              tone="danger"
            />
          ) : null}
          {downloadedCount > 0 ? (
            <CountBadge
              count={downloadedCount}
              style={styles.downloadedBadge}
              testID={`home-feed-cell-downloaded-${row.id}`}
              tone="muted"
            />
          ) : null}
          {unseenBadge !== null ? (
            <UnseenIndicator
              style={styles.unseenIndicator}
              testID={`home-feed-cell-unseen-${row.id}`}
            />
          ) : null}
        </View>
      </Pressable>
      {shouldMountRowMoreMenu(removeAction !== undefined, hasOpenedMenu) ? (
        <MoreMenu
          cancelLabel={t('misc.cancel')}
          onCancel={closeMenu}
          sections={menuSections}
          testID={`${cellTestID}-menu`}
          visible={isMenuVisible}
        />
      ) : null}
    </>
  );
});
