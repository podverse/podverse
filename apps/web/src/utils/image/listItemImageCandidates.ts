/** Resolve artwork URLs for list/grid rows from Core/API candidate chains. */
export function listItemImageCandidates(item: { imageCandidates?: string[] }): string[] {
  return item.imageCandidates ?? [];
}
