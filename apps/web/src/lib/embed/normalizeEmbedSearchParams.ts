export function normalizeEmbedSearchParams(
  raw: Record<string, string | string[] | undefined>
): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) {
      continue;
    }

    normalized[key] = Array.isArray(value) ? value[0] : value;
  }

  return normalized;
}
