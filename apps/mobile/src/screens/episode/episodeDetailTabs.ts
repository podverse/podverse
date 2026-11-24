import { insertBoostsChip } from '../../lib/boost/insertBoostsChip';
import type { ItemSectionChromeFlags } from '../../lib/sectionChromeFlags';
import type { EpisodeTab } from '../../prefs/detailListPrefs';
import type { EpisodeTabItem } from './episodeTabs';
import { resolveEpisodeTabs } from './episodeTabs';

export type EpisodeDetailTab = EpisodeTab | 'boosts';

/**
 * Episode chips, with Boosts immediately before Funding when this item can show the public list.
 */
export const resolveEpisodeDetailTabs = (input: {
  episode: EpisodeTabItem | null;
  previewFlags: ItemSectionChromeFlags | null;
  hasBoosts: boolean;
}): EpisodeDetailTab[] => insertBoostsChip(resolveEpisodeTabs(input), input.hasBoosts, 'funding');
