/**
 * Draft text for a playlist tag, before it is a chip.
 *
 * Search uses the trimmed draft. An empty trim is not a query. Committing compares names the
 * same way a title filter does: trim and lowercase, and leave spaces and a leading article in
 * the name. The chip keeps the trimmed spelling that was committed.
 */

export const TAG_SEARCH_DEBOUNCE_MS = 450;

export type PlaylistTagCommitStatus = 'empty' | 'at-max' | 'too-long' | 'duplicate' | 'added';

export type PlaylistTagDraftResult = {
  status: PlaylistTagCommitStatus;
  tags: readonly string[];
};

/** Trimmed draft, or `null` when the trim is empty. */
export function playlistTagSearchQuery(draft: string): string | null {
  const trimmed = draft.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

/**
 * Trim `draft` and decide whether it becomes the next chip.
 *
 * A full list stays full: `maxCount` is checked before a duplicate or a long name. Every status
 * other than `added` returns the same `tags` array the caller passed.
 */
export function commitPlaylistTagDraft(input: {
  tags: readonly string[];
  draft: string;
  maxCount?: number;
  maxLength?: number;
}): PlaylistTagDraftResult {
  const trimmed = input.draft.trim();
  if (trimmed.length === 0) {
    return { status: 'empty', tags: input.tags };
  }

  if (typeof input.maxCount === 'number' && input.tags.length >= input.maxCount) {
    return { status: 'at-max', tags: input.tags };
  }

  if (typeof input.maxLength === 'number' && trimmed.length > input.maxLength) {
    return { status: 'too-long', tags: input.tags };
  }

  const comparisonKey = trimmed.toLowerCase();
  const isDuplicate = input.tags.some((tag) => tag.trim().toLowerCase() === comparisonKey);
  if (isDuplicate) {
    return { status: 'duplicate', tags: input.tags };
  }

  return { status: 'added', tags: [...input.tags, trimmed] };
}
