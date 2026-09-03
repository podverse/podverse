import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useAutoQueue } from '../../contexts/AutoQueueProvider';
import { usePrimaryQueue } from '../../hooks/usePrimaryQueue';
import { useQueueResources } from '../../hooks/useQueueResources';
import { clipToHomeRow, itemToHomeRow } from '../../lib/rows/homeRowMappers';
import type { HomeMediaType } from '../../prefs/preferredMediaType';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';

type UpNextRow = {
  key: string;
  mediaType: HomeMediaType;
  row: HomeFeedRowData;
};

/**
 * Full player up-next sheet. Lists manual upcoming rows from the server queue first, then the
 * seeded auto-queue rows. Rows carry playable id prefixes so tapping play routes through the shared
 * orchestrator (`useHomeRowPlayback`). Shows an i18n empty state when nothing is upcoming.
 */
export function FullPlayerUpNext() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { fetchPrimaryQueue } = usePrimaryQueue();
  const { fetchUpcoming } = useQueueResources();
  const { autoQueueResources } = useAutoQueue();
  const { runPlayAction, runQueueAction } = useHomeRowPlayback();

  const [manualRows, setManualRows] = useState<UpNextRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const queue = await fetchPrimaryQueue();
        if (queue === null) {
          if (!cancelled) {
            setManualRows([]);
          }
          return;
        }
        const upcoming = await fetchUpcoming(queue.id_text);
        if (cancelled) {
          return;
        }
        setManualRows(
          upcoming.map((resource) => {
            const itemRow = itemToHomeRow(resource.item);
            return {
              key: `manual-${resource.id}`,
              mediaType: itemRow.mediaType,
              row: { ...itemRow, id: `item-${itemRow.id}` },
            };
          })
        );
      } catch {
        if (!cancelled) {
          setManualRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPrimaryQueue, fetchUpcoming]);

  const autoRows = useMemo<UpNextRow[]>(() => {
    return Object.keys(autoQueueResources)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((index) => {
        const resource = autoQueueResources[index];
        if (resource === undefined) {
          return [];
        }
        if (resource.clip !== null) {
          const clipRow = clipToHomeRow(resource.clip);
          return [
            {
              key: `auto-${index}-clip-${resource.clip.id_text}`,
              mediaType: 'clips' as HomeMediaType,
              row: { ...clipRow, id: `clip-${resource.clip.id_text}` },
            },
          ];
        }
        if (resource.item === null || resource.item === undefined) {
          return [];
        }
        const itemRow = itemToHomeRow(resource.item);
        return [
          {
            key: `auto-${index}-item-${resource.item.id_text}`,
            mediaType: itemRow.mediaType,
            row: { ...itemRow, id: `item-${itemRow.id}` },
          },
        ];
      });
  }, [autoQueueResources]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        empty: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          paddingVertical: tokens.spacing.md,
        },
        heading: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          fontWeight: '600',
          marginBottom: tokens.spacing.sm,
          marginTop: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const renderRow = ({ mediaType, row }: UpNextRow) => (
    <HomeFeedRow
      mediaType={mediaType}
      onPlayPress={(nextRow) => {
        runPlayAction(nextRow, mediaType);
      }}
      onPress={() => {}}
      onQueuePress={(nextRow, position) => {
        runQueueAction(nextRow, mediaType, position);
      }}
      row={row}
    />
  );

  const isEmpty = manualRows.length === 0 && autoRows.length === 0;

  return (
    <View testID="full-player-up-next-sheet">
      {isEmpty ? (
        <Text style={styles.empty} testID="full-player-up-next-empty">
          {t('media_player.up_next_empty')}
        </Text>
      ) : (
        <>
          {manualRows.length > 0 ? (
            <View testID="full-player-up-next-manual">
              <Text style={styles.heading}>{t('media_player.up_next')}</Text>
              {manualRows.map((entry) => (
                <View key={entry.key}>{renderRow(entry)}</View>
              ))}
            </View>
          ) : null}
          {autoRows.length > 0 ? (
            <View testID="full-player-up-next-auto">
              <Text style={styles.heading}>{t('media_player.auto_queue')}</Text>
              {autoRows.map((entry) => (
                <View key={entry.key}>{renderRow(entry)}</View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
