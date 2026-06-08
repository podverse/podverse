export function parseEmbedChapterMarkers(value: unknown): boolean {
  if (value === false || value === 'false' || value === '0') {
    return false;
  }

  return true;
}
