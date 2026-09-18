# 778-defer-playlist-medium-and-public-sort

**Master step:** P2.3 (operational backlog)
**Model (author + implement):** Codex 5.3
**Status:** deferred

## Scope

Two playlist list gaps left out of P2.1.6 so the set stays mobile-only and API-stable.

### Public playlist sorts beyond top

Browse → playlists and web's public `/playlists` tab only have `GET /playlist/public/top`. Offering
A–Z / recent / oldest for public playlists needs new API routes, ORM queries, OpenAPI entries, and
web + mobile clients. Product has not asked for that yet; keep Browse on top + range until then.

### Library AV / Music medium filter

Web's `/playlists` page has AV / Music medium tabs on every type. Mobile Library playlists in
[772](772-library-playlists-list.md) uses `medium: 'all'` and only My / Followed chips + sort/range.
Whether Library needs an AV / Music filter (chips or sort companion) is an open product call — the
API already accepts `medium: 'av' | 'music' | 'all'`, so this is UI + prefs work, not a schema change.

### Why deferred

P2.1.6 deliberately avoids API / ORM work
([`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc)). Public sorts are
cross-surface; medium filter is undecided and easy to add later without blocking create / detail /
reorder.

## Acceptance criteria (when picked up)

- Public lists expose the decided sorts on web and mobile with matching endpoints.
- If Library gets a medium filter, selection persists per instance
  ([`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc)).

## Web parity references

- [`PlaylistsPageListHeader`](apps/web/src/app/playlists/PlaylistsPageListHeader.tsx) — medium tabs
- [`PlaylistsPageDropdownConfig`](apps/web/src/app/playlists/PlaylistsPageDropdownConfig.ts) —
  public sort limited to top
- `apps/api/src/routes/playlist.ts` — public top only today

## Verification

```bash
# When implemented — web + mobile as applicable
make e2e_test_web_report_spec SPEC=e2e/playlists.spec.ts
npm run mobile:e2e:test -- library-playlists
npm run mobile:e2e:test -- browse
```
