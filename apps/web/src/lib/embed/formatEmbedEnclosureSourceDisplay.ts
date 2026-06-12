/**
 * Summary text for enclosure source URIs in the embed alternate-enclosure picker.
 * HTTP(S) sources show the hostname; other schemes show the full URI.
 */
export function formatEmbedEnclosureSourceDisplay(uri: string | null | undefined): string | null {
  if (uri === null || uri === undefined) {
    return null;
  }

  const trimmed = uri.trim();
  if (trimmed === '') {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      if (parsed.hostname !== '') {
        return parsed.hostname;
      }

      return null;
    }
  } catch {
    // Fall through to the full URI for non-URL or unsupported schemes.
  }

  return trimmed;
}
