export function parseEmbedListEnabled(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true' || value === '1' || value === 'on') {
    return true;
  }

  if (value === false || value === 'false' || value === '0' || value === 'off') {
    return false;
  }

  return undefined;
}
