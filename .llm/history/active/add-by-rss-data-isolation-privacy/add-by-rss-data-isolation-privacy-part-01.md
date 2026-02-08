# Add-by-RSS Data Isolation (Privacy) – History

## Session 1 - 2025-02-07

#### Prompt (Developer)

implement the @podverse/.llm/plans/active/add-by-rss-interaction-parity/02-data-isolation-privacy.md

#### Key Decisions

- Redaction implemented in ORM `PlaylistResourceService`: new private method `redactAddByRSSForNonOwner` clears `add_by_rss_resource_data` and sets `is_add_by_rss_redacted: true` when requester is not playlist owner.
- Playlist `getByIdText` now loaded with `relations: ['account']` in the three resource methods that can return data to non-owners (`getManyByPlaylistIdText`, `getManyForQueueByListPosition`, `getManyByPlaylistShuffle`) so owner id is available for redaction.
- Queue endpoints confirmed owner-only via `verifyQueueOwnership`; no API redaction for queue.
- `getPlaylistById` does not return `playlist_resources` (only account relations), so no redaction needed there.
- Web: queue and playlist list rows show placeholder "Private add-by-RSS item" when `is_add_by_rss_redacted === true`; redacted rows do not offer remove/play.

#### Files Modified

- `packages/helpers/src/dtos/queue/queueResource.ts` – added `is_add_by_rss_redacted?: boolean`
- `packages/helpers/src/dtos/playlist/playlistResource.ts` – added `is_add_by_rss_redacted?: boolean`
- `packages/orm/src/services/playlist/playlistResource.ts` – added `redactAddByRSSForNonOwner`, applied in getManyByPlaylistIdText, getManyForQueueByListPosition, getManyByPlaylistShuffle
- `apps/web/i18n/originals/en-US.json` – added `add_by_rss.private_item_placeholder`
- `apps/web/src/components/List/Queues/ListQueueResourceRow.tsx` – handle `is_add_by_rss_redacted` (placeholder title, hide remove when redacted)
- `apps/web/src/components/List/Playlists/ListPlaylistResourceRow.tsx` – add-by-RSS branch: placeholder when redacted, title + remove when owner
