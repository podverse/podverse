import { commitPlaylistTagDraft } from '../../components/form/playlistTagDraft';

export type PlaylistFormTagsSaveResult = {
  ok: true;
  tags: readonly string[];
  clearDraft: boolean;
};

/**
 * Decides the tag list a playlist save sends, including text still in the box.
 * An empty draft, a name already on the list, and a newly added name clear the box.
 * A full list, or a name longer than the character cap, keeps the box and the current chips.
 * Save always proceeds. The box already stops at that cap.
 */
export function playlistFormTagsForSave(input: {
  tags: readonly string[];
  draft: string;
  maxCount: number;
  maxLength: number;
}): PlaylistFormTagsSaveResult {
  const result = commitPlaylistTagDraft({
    tags: input.tags,
    draft: input.draft,
    maxCount: input.maxCount,
    maxLength: input.maxLength,
  });

  if (result.status === 'too-long' || result.status === 'at-max') {
    return { ok: true, tags: result.tags, clearDraft: false };
  }

  return { ok: true, tags: result.tags, clearDraft: true };
}
