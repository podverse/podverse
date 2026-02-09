# Subplan 2: Add-by-RSS Data Isolation (Privacy)

## Goal

Add-by-RSS data (feed URL, token, `add_by_rss_resource_data`, enclosure URLs)
must **never** be returned from the API except to the **account that owns** the
add-by-RSS feed (the account in `AccountFollowingAddByRSSChannel`). When a
playlist is public or shared, non-owners must see only a safe placeholder for
add-by-RSS items, not any private data.

## Rule

- Add-by-RSS content is **private**: the feed URL may contain an access token.
- Return full add-by-RSS resource data **only** when the requester is the owner
  of the queue or playlist (and thus the only one who could have added that
  add-by-RSS item).
- For any other viewer (e.g. public playlist viewer): redact
  `add_by_rss_resource_data` and any field that could reveal feed URL or token;
  optionally return `is_add_by_rss_redacted: true` and a placeholder label so
  the client can show "Private add-by-RSS item" without attempting to play.

---

## Step 1: List all API and ORM paths that return queue or playlist resources

**Audit list** (confirm and add any missing):

1. **Queue**
   - Route/controller that returns queue resources for the current user's queue
     (e.g. get queue by id, get queue resources). Likely in
     `apps/api/src/routes/queue.ts` and `apps/api/src/controllers/queue/`.
   - Any "get all queues" or "get queue resources" used by the web app.

2. **Playlist**
   - `GET /playlist/:playlist_id_text` → `PlaylistController.getPlaylistById`
     (`apps/api/src/controllers/playlist/playlist.ts` or similar). This may
     return playlist + resources. **Critical**: when playlist is **public**,
     the requester may not be the owner; must redact add-by-RSS for non-owners.
   - Any "list playlists" that includes resources (e.g. for profile).
   - Playlist resource list endpoints.

3. **Profile / export**
   - Profile page that shows user's playlists or queue (if it loads resources).
   - Account data export (if it includes queue/playlist resources).

4. **ORM**
   - Where are `QueueResource` or `PlaylistResource` entities (or DTOs) built
     for API response? e.g. `packages/orm/src/services/queue/queueResource.ts`
     (getAllByAccountAbridged, or methods that return resources with
     add_by_rss_resource_data). Playlist resource service similarly.

**Concrete endpoints** (see also `apps/api/src/routes/queue.ts`, `apps/api/src/routes/playlist.ts`):

- **Queue**: `GET /queue/all-for-account/private` → QueueController.getAllPrivate; `GET /queue/resources/all-by-account-abridged` → QueueResourceController.getAllByAccountAbridged; `GET /queue/:queue_id_text/resources/now-playing`, `.../upcoming-all`, `.../history-paginated` → QueueResourceController. All return owner's queue resources (may include add_by_rss_resource_data).
- **Playlist**: `GET /playlist/:playlist_id_text` → PlaylistController.getPlaylistById (redact add-by-RSS for non-owner); `GET /playlist/:playlist_id_text/resources`, `.../private-all`, `.../queue-by-list-position`, `.../shuffle` → PlaylistResourceController.
- **ORM**: `packages/orm/src/services/queue/queueResource.ts`, `packages/orm/src/services/playlist/` (where DTOs with add_by_rss_resource_data are built).

**Deliverable**: Audit each above; for playlist endpoints implement ownership check and redaction for non-owners. Queue: confirm auth scoping so only owner's resources are returned.

---

## Step 2: Define redaction behavior

1. **Owner**: Requester is the account that owns the queue or playlist. For
   queue, owner = queue's account. For playlist, owner = playlist's account.
   Return full resource including `add_by_rss_resource_data` for add-by-RSS
   rows.

2. **Non-owner**: Requester is not the owner (e.g. viewing a public playlist).
   For each resource that is add-by-RSS (has `add_by_rss_hash_id` or
   `add_by_rss_resource_data`):
   - Do **not** include `add_by_rss_resource_data`.
   - Do not include any derived field that could leak the feed URL (e.g.
     enclosure URL from that payload).
   - Optionally set `is_add_by_rss_redacted: true` (or equivalent) so the
     client can show a placeholder.
   - Optionally include a safe label like "Private add-by-RSS item" (or
     translation key) so list position is preserved and the row is visible
     without play capability for non-owners.

3. **Queue**: Queues are account-scoped (user's own queues). Ensure the only
   endpoint that returns queue resources is one that requires authentication
   and returns only that user's queue(s). Then every returned resource is
   "owned"; no redaction needed for queue per se. If there is any path where
   queue resources could be exposed to another account, apply the same
   redaction.

**Deliverable**: Document "owner vs non-owner" and "what to strip" in this plan
or in a short doc; implement accordingly in Step 3.

---

## Step 3: Implement redaction in API/ORM layer

1. **Identify response builders**: Where are DTOs for queue resources and
   playlist resources built? (e.g. in controllers or in ORM services that
   return to the controller.)

2. **Add ownership check for playlist**:
   - When returning a playlist (e.g. `getPlaylistById`), determine if the
     requester is the playlist owner (e.g. compare `req.account.id` or
     `req.user.id` with playlist's account_id).
   - When building each playlist resource in the response: if the resource is
     add-by-RSS and the requester is **not** the playlist owner, redact as in
     Step 2 (omit add_by_rss_resource_data, set is_add_by_rss_redacted, etc.).

3. **Queue**: Confirm that queue resource endpoints are always scoped to the
   authenticated user's queue. If so, no redaction. If any endpoint could
   return another user's queue, add the same redaction.

4. **ORM**: If the ORM returns raw entities, redaction may be done in the
   controller or in a serialization layer. Prefer a single place (e.g. a
   helper that, given a resource and "isOwner", returns the safe DTO). Ensure
   no add-by-RSS payload is ever sent to the client when isOwner is false.

**Audit**: Call "get public playlist by id" as a different user (or
unauthenticated if allowed). Response must not contain `add_by_rss_resource_data`
or feed URLs for add-by-RSS items. Owner calling "get my playlist" still sees
full data.

---

## Step 4: Web – handle redacted add-by-RSS rows

1. **Queue list**: If the API can return redacted add-by-RSS rows (e.g. in a
   shared queue scenario), the queue UI must show a placeholder (e.g. "Private
   add-by-RSS item") and not attempt to play or show enclosure. Use
   `is_add_by_rss_redacted` if present.

2. **Playlist view (public or shared)**: When the user is viewing someone
   else's playlist, add-by-RSS rows may be redacted. Show placeholder text;
   hide or disable play button for those rows. Preserve list order and
   position.

**Audit**: View a public playlist that contains add-by-RSS items (as
non-owner). UI shows placeholders; no play; no feed URL or token visible in
network or DOM.

---

## Step 5: Basic Auth (future)

If Basic Auth for add-by-RSS is implemented later: username/password must
**never** be returned in API responses, even to the owning account. Only
allow set/update; never echo password. This plan does not implement Basic Auth
but the isolation rule applies when it exists.

---

## Deliverables checklist

- [x] Audit list of all API/ORM paths that return queue or playlist resources.
- [x] Redaction rule documented (owner vs non-owner; what to strip).
- [x] Playlist get (including public) redacts add-by-RSS for non-owners.
- [x] Queue paths confirmed owner-only (or redaction added if not).
- [x] Web handles redacted rows (placeholder, no play) in queue/playlist views.
- [ ] Test: public playlist with add-by-RSS → non-owner sees no add-by-RSS
  data; owner sees full data.

---

## Files reference

| Area           | Path |
| -------------- | ---- |
| Playlist routes| `apps/api/src/routes/playlist.ts` |
| Playlist controller | `apps/api/src/controllers/playlist/` (e.g. playlist.ts, playlistResource.ts) |
| Queue routes   | `apps/api/src/routes/queue.ts` |
| Queue controller | `apps/api/src/controllers/queue/` (queueResource.ts, etc.) |
| ORM queue      | `packages/orm/src/services/queue/queueResource.ts` |
| ORM playlist   | `packages/orm/src/services/playlist/` |
