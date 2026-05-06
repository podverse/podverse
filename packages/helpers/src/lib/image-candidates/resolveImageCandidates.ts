/** Normalize explicit candidate URLs or fall back to a single `src`. */
export function resolveImageCandidates(
  candidates: string[] | undefined,
  src: string | null | undefined
): string[] {
  if (candidates !== undefined) {
    return candidates.map((url) => url.trim()).filter((url) => url !== '');
  }
  if (src !== null && src !== undefined && src.trim() !== '') {
    return [src.trim()];
  }
  return [];
}
