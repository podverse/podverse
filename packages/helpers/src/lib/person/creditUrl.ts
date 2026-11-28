/**
 * An http or https URL from a person credit.
 * A host that does not answer still counts. Callers do not request the URL to find out.
 */
export function personCreditHttpUrl(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (parsed.hostname === '') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}
