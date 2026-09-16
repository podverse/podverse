import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { DTOQueueResource } from '@podverse/helpers';

import type { MoreMenuItem, MoreMenuSection } from '../../components/primitives/MoreMenu';
import { MoreMenu } from '../../components/primitives/MoreMenu';
import { useAutoQueue } from '../../contexts/AutoQueueProvider';
import { usePrimaryQueue } from '../../hooks/usePrimaryQueue';
import { useQueueResources } from '../../hooks/useQueueResources';
import { usePlaybackSession } from '../../playback/PlaybackProvider';

type UpNextAction = {
  key: string;
  label: string;
  onPress: () => void;
};

/**
 * Full player up-next sheet. Lists manual upcoming rows from the server queue first, then seeded
 * auto-queue rows. Closing/selection behavior comes from `MoreMenu`.
 */
type FullPlayerUpNextProps = {
  onCancel: () => void;
  visible: boolean;
};

const queueResourceLabel = (resource: DTOQueueResource): string | null => {
  const clipTitle = resource.clip?.title;
  if (clipTitle !== undefined && clipTitle !== null && clipTitle.length > 0) {
    return clipTitle;
  }
  const itemTitle = resource.item?.title;
  if (itemTitle !== undefined && itemTitle !== null && itemTitle.length > 0) {
    return itemTitle;
  }
  const soundbiteTitle = resource.item_soundbite?.title;
  if (soundbiteTitle !== undefined && soundbiteTitle !== null && soundbiteTitle.length > 0) {
    return soundbiteTitle;
  }
  return resource.item?.id_text ?? resource.clip?.id_text ?? null;
};

export function FullPlayerUpNext({ onCancel, visible }: FullPlayerUpNextProps) {
  const { t } = useTranslation();
  const { fetchPrimaryQueue } = usePrimaryQueue();
  const { fetchUpcoming } = useQueueResources();
  const { autoQueueResources } = useAutoQueue();
  const { playClipById, playItemById } = usePlaybackSession();

  const [manualActions, setManualActions] = useState<UpNextAction[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const queue = await fetchPrimaryQueue();
        if (queue === null) {
          if (!cancelled) {
            setManualActions([]);
          }
          return;
        }
        const upcoming = await fetchUpcoming(queue.id_text);
        if (cancelled) {
          return;
        }
        const nextActions = upcoming.flatMap((resource): UpNextAction[] => {
          const label = queueResourceLabel(resource);
          if (label === null) {
            return [];
          }
          if (resource.clip?.id_text !== undefined && resource.clip.id_text.length > 0) {
            const clipIdText = resource.clip.id_text;
            return [
              {
                key: `manual-clip-${clipIdText}`,
                label,
                onPress: () => {
                  void playClipById(clipIdText);
                },
              },
            ];
          }
          const itemIdText = resource.item?.id_text;
          if (itemIdText === undefined || itemIdText.length === 0) {
            return [];
          }
          return [
            {
              key: `manual-item-${itemIdText}`,
              label,
              onPress: () => {
                void playItemById(itemIdText);
              },
            },
          ];
        });
        setManualActions(nextActions);
      } catch {
        if (!cancelled) {
          setManualActions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPrimaryQueue, fetchUpcoming, playClipById, playItemById]);

  const autoActions = useMemo<UpNextAction[]>(() => {
    return Object.keys(autoQueueResources)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((index): UpNextAction[] => {
        const resource = autoQueueResources[index];
        if (resource === undefined) {
          return [];
        }
        if (resource.clip !== null) {
          const clipIdText = resource.clip.id_text;
          const label = resource.clip.title ?? clipIdText;
          return [
            {
              key: `auto-clip-${clipIdText}`,
              label,
              onPress: () => {
                void playClipById(clipIdText);
              },
            },
          ];
        }
        if (resource.item === null || resource.item === undefined) {
          return [];
        }
        const label = resource.item.title ?? resource.item.id_text;
        return [
          {
            key: `auto-item-${resource.item.id_text}`,
            label,
            onPress: () => {
              void playItemById(resource.item.id_text);
            },
          },
        ];
      });
  }, [autoQueueResources, playClipById, playItemById]);

  const sections = useMemo<MoreMenuSection[]>(() => {
    const allSections: MoreMenuSection[] = [];
    if (manualActions.length > 0) {
      allSections.push({
        items: manualActions.map((action): MoreMenuItem => ({
          key: action.key,
          label: action.label,
          onPress: action.onPress,
          testID: `full-player-up-next-${action.key}`,
        })),
        key: 'manual',
        title: t('media_player.up_next'),
      });
    }
    if (autoActions.length > 0) {
      allSections.push({
        items: autoActions.map((action): MoreMenuItem => ({
          key: action.key,
          label: action.label,
          onPress: action.onPress,
          testID: `full-player-up-next-${action.key}`,
        })),
        key: 'auto',
        title: t('media_player.auto_queue'),
      });
    }
    if (allSections.length === 0) {
      allSections.push({
        items: [
          {
            disabled: true,
            key: 'empty',
            label: t('media_player.up_next_empty'),
            onPress: () => {},
            testID: 'full-player-up-next-empty',
          },
        ],
        key: 'empty',
      });
    }
    return allSections;
  }, [autoActions, manualActions, t]);

  return (
    <MoreMenu
      cancelLabel={t('misc.cancel')}
      onCancel={onCancel}
      sections={sections}
      testID="full-player-up-next-sheet"
      visible={visible}
    />
  );
}
