export function parseEmbedAutoResize(value: unknown): boolean {
  if (value === true || value === 'true' || value === '1') {
    return true;
  }

  return false;
}
