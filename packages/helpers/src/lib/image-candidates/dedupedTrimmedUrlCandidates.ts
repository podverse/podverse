/** Unique non-empty trimmed strings, first-seen order preserved. */
export function dedupedTrimmedUrlCandidates(values: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of values) {
    if (typeof u !== 'string') {
      continue;
    }
    const t = u.trim();
    if (t !== '' && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
