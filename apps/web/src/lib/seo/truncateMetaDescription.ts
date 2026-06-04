const DEFAULT_META_DESCRIPTION_MAX_LENGTH = 160;
const MIN_WORD_BOUNDARY_FALLBACK_LENGTH = 60;

export const truncateMetaDescription = (text: string, maxLength = DEFAULT_META_DESCRIPTION_MAX_LENGTH) => {
  const normalized = text.trim();
  if (normalized === '' || maxLength <= 0) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const candidate = normalized.slice(0, maxLength + 1);
  const lastWhitespaceIndex = candidate.lastIndexOf(' ');
  const shouldUseWordBoundary = lastWhitespaceIndex >= MIN_WORD_BOUNDARY_FALLBACK_LENGTH;

  if (shouldUseWordBoundary) {
    return candidate.slice(0, lastWhitespaceIndex).trimEnd();
  }

  return normalized.slice(0, maxLength).trimEnd();
};
