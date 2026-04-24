import type { DTOItem } from '@podverse/helpers';

/**
 * When the full-size player shows VTS/remote “override” metadata, return the **canonical** item
 * whose like state should be toggled. Wire this to real value-time-split payloads from the item DTO
 * and currentTime when the API returns nested splits + resolved child items to the client.
 */
export function getResolvedVtsLikeTargetItem(
  _item: DTOItem | null,
  _currentTimeSeconds: number
): DTOItem | null {
  return null;
}
