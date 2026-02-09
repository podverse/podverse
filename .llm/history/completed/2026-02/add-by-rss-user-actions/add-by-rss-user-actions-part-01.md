# Feature: add-by-rss-user-actions (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `add-by-rss-user-actions-part-02.md`.

## Metadata

- Started: 2026-02-07
- Completed: 2026-02-09
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/69
- Branch: feature/add-by-rss-user-actions
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[What problem does this solve? What's the goal?]

## Sessions

### Session 1 - 2026-02-07

#### Prompt (Developer)

[First prompt will go here]

#### Key Decisions

- [Decision and rationale]

#### Files Changed

- [List of files]

### Session 2 - 2026-02-09

#### Prompt (Developer)

fix the error

#### Key Decisions

- Guarded URI parsing with a safe fallback to keep filename extension extraction type-safe.

#### Files Modified

- packages/helpers/src/lib/fileName.ts

### Session 3 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Mapped add-by-RSS enclosures to full DTO shape with synthetic IDs and nullable integrity.
- Relaxed DTO integrity to allow null so add-by-RSS data matches DTO expectations.
- Replaced deprecated PayPal SDK with paypal-server-sdk and updated API usage to status fields.
- Updated Lighthouse to resolve audit issues and added glob override to clear deprecation warnings.

#### Files Modified

- apps/api/src/controllers/account/accountPayPalOrder.ts
- apps/web/src/utils/downloadModal/downloadAddByRSSMediaWithModal.ts
- package-lock.json
- package.json
- packages/external-services-paypal/src/@types/modules.d.ts
- packages/external-services-paypal/package.json
- packages/external-services-paypal/src/index.ts
- packages/helpers/src/dtos/item/itemEnclosure.ts
- tools/web-perf/lighthouse/package.json

### Session 4 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Used the clicked source URI for downloads so the filename extension matches the selected enclosure.

#### Files Modified

- apps/web/src/components/SourceSelectors/SourceSelectors.tsx

### Session 5 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Rendered the playlist modal when add-by-RSS data is present.
- Added an empty-state CTA when no playlists exist.

#### Files Modified

- apps/web/src/components/Modals/Modals.tsx
- apps/web/src/components/Modal/ModalPlaylistAddTo.tsx
- apps/web/i18n/originals/en-US.json

### Session 6 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Brought playlist add-by-RSS rows to queue parity with images, metadata, and play-on-click.
- Expanded add-by-RSS MoreButton menus to match track/episode rows plus remove-from-playlist.

#### Files Modified

- apps/web/src/components/List/Playlists/ListPlaylistResourceRow.tsx
- apps/web/src/components/List/Playlists/ListPlaylistResources.tsx

### Session 7 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Removed stale add-by-RSS hook usage to fix runtime error in playlist rows.
- Matched playlist list spacing to queue list spacing for consistent gaps and margins.

#### Files Modified

- apps/web/src/components/List/Playlists/ListPlaylistResourceRow.tsx
- apps/web/src/styles/components/List/Playlists/ListPlaylistResources.module.scss

### Session 8 - 2026-02-09

#### Prompt (Developer)

the playlist page should display the global loading spinner instead of the smaller one within the list component

#### Key Decisions

- Lifted playlist loading state to page context and rendered the global spinner in the page list.
- Removed list-level loading overlay so only the global spinner appears.

#### Files Modified

- apps/web/src/components/List/Playlists/ListPlaylistResources.tsx
- apps/web/src/app/playlist/[playlist_id]/PlaylistPageContext.tsx
- apps/web/src/app/playlist/[playlist_id]/PlaylistPageList.tsx

### Session 9 - 2026-02-09

#### Prompt (Developer)

Now the global spinner is working correctly on the playlist page, but the smaller loading spinner is also appearing, and there should only be one. Look at how the queue implements it. There should be implemented similarly on playlist

#### Key Decisions

- Removed the lazy-load placeholder spinner so the playlist page only uses the global overlay.

#### Files Modified

- apps/web/src/app/playlist/[playlist_id]/PlaylistPageList.tsx

### Session 10 - 2026-02-09

#### Prompt (Developer)

The playlist edit page drop-down menu items should only have one menu item and it should be removed from playlist.

#### Key Decisions

- Limited playlist edit mode menus to remove-from-playlist across all playlist row types.

#### Files Modified

- apps/web/src/components/List/Playlists/ListPlaylistResourceRow.tsx
- apps/web/src/components/List/Podcasts/Episodes/ListEpisodeRow.tsx
- apps/web/src/components/List/Music/Albums/Tracks/ListTrackRow.tsx
- apps/web/src/components/List/Clips/ListClipRow.tsx
- apps/web/src/components/List/ItemSoundbites/ListItemSoundbiteRow.tsx

---

## Related Resources

- [Link to PR]
- [Link to related issues]
