import type { ItemSectionChromeFlags } from '../../lib/sectionChromeFlags';
import type { EpisodeTab } from '../../prefs/detailListPrefs';
import { EPISODE_TABS } from '../../prefs/detailListPrefs';

export const EPISODE_TAB_LABEL_KEYS: Record<EpisodeTab, string> = {
  chapters: 'info.chapter.chapters',
  clips: 'features.clip.clips',
  soundbites: 'info.soundbite.official_clips',
  summary: 'info.summary.summary',
  transcript: 'info.transcript.transcript',
};

export type EpisodeTabItem = {
  item_chapters_feed?: unknown;
  item_soundbites?: readonly unknown[] | null;
  item_transcripts?: readonly unknown[] | null;
};

const ALWAYS_ON_EPISODE_TABS: ReadonlySet<EpisodeTab> = new Set(['clips', 'summary']);

export const itemHasChapters = (item: EpisodeTabItem): boolean => {
  return item.item_chapters_feed !== null && item.item_chapters_feed !== undefined;
};

export const itemHasSoundbites = (item: EpisodeTabItem): boolean => {
  return (item.item_soundbites?.length ?? 0) > 0;
};

export const itemHasTranscript = (item: EpisodeTabItem): boolean => {
  return (item.item_transcripts?.length ?? 0) > 0;
};

export const itemSectionFlagsFromDto = (item: EpisodeTabItem): ItemSectionChromeFlags => {
  return {
    hasChapters: itemHasChapters(item),
    hasSoundbites: itemHasSoundbites(item),
    hasTranscript: itemHasTranscript(item),
  };
};

/**
 * Summary and Clips are always offered. Chapters, official clips, and transcript sit last and
 * appear from cached evidence until the item DTO confirms them.
 */
export const resolveEpisodeTabs = ({
  episode,
  previewFlags,
}: {
  episode: EpisodeTabItem | null;
  previewFlags: ItemSectionChromeFlags | null;
}): EpisodeTab[] => {
  const hasChapters =
    episode !== null ? itemHasChapters(episode) : previewFlags?.hasChapters === true;
  const hasSoundbites =
    episode !== null ? itemHasSoundbites(episode) : previewFlags?.hasSoundbites === true;
  const hasTranscript =
    episode !== null ? itemHasTranscript(episode) : previewFlags?.hasTranscript === true;

  return EPISODE_TABS.filter((tab) => {
    if (ALWAYS_ON_EPISODE_TABS.has(tab)) {
      return true;
    }
    if (tab === 'chapters') {
      return hasChapters;
    }
    if (tab === 'soundbites') {
      return hasSoundbites;
    }
    if (tab === 'transcript') {
      return hasTranscript;
    }
    return true;
  });
};
