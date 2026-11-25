import type { QueryParamsPodcastIndexSearchMedium, SortPrefValue } from '@podverse/helpers';
import { resolvePodcastIndexSearchMedium } from '@podverse/helpers';

export function searchMediumForCatalog(
  stored: SortPrefValue | null | undefined,
  musicEnabled: boolean
): QueryParamsPodcastIndexSearchMedium {
  const medium = resolvePodcastIndexSearchMedium(stored);
  if (!musicEnabled && medium === 'music') {
    return 'all';
  }
  return medium;
}
