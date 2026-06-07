export function parseEmbedAutoplay(value: unknown): boolean {
  if (value === true || value === 'true' || value === '1') {
    return true;
  }

  return false;
}
