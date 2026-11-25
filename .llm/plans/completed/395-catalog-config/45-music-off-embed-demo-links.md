**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 45 — Embed demo page omits album and track when Music is off

`/embed` lists demo players. The catalog includes album and track demos
(`embedDemoShowcaseCatalog.ts`, route kinds `album` and `track`). The footer links to this
page. When Music is off, those cards are not listed. Episode, clip, chapter, and podcast cards
stay. Official-clip and playlist stay hidden, which is already what
`HIDDEN_DEMO_ROUTE_KINDS` does.

Album and track embed URLs stay as they are. Plan 11's stored-content spec already opens
`/embed/album/` and `/embed/track/` with Music off. This plan only stops the demo page from
offering those cards. It does not call `notFound()` and does not change a player link.

## Rows

R15

## Runs after

10

## Files

- apps/web/src/lib/embed/embedDemoMusicRoutes.ts
- apps/web/src/lib/embed/embedDemoMusicRoutes.test.ts
- apps/web/src/lib/embed/resolveEmbedDemoShowcase.ts

## Settled decisions

- Drop route kinds `album` and `track` only. `episode-chapters`, `clip`, `chapter`, and
  `podcast` stay, including the podcast-clips showcases (their route kind is `podcast`).
- Filter in `resolveEmbedDemoShowcase` beside the existing `HIDDEN_DEMO_ROUTE_KINDS` check, so
  a card never reaches the page. Do not edit `EMBED_DEMO_SHOWCASE_CATALOG` or its order test.
  Music on still lists album and track.
- Do not edit `apps/web/src/app/embed/album/**` or `embed/track/**`. Those routes keep loading
  the stored album and track. The demo catalog has no music-livestream card; do not add one.
- No Playwright spec. The demo list comes from `reqEmbedDemoGetShowcase`, and the E2E seed does
  not configure those showcases, so a browser assertion would pass on an empty page. The unit
  test is the check.

## Helper — `apps/web/src/lib/embed/embedDemoMusicRoutes.ts` (new)

```typescript
import type { EmbedRouteKind } from './embedTypes';

/** Album and track demo cards. Other embed demos stay when Music is off. */
export function embedDemoRouteOffered(routeKind: EmbedRouteKind, musicEnabled: boolean): boolean {
  if (musicEnabled) {
    return true;
  }
  return routeKind !== 'album' && routeKind !== 'track';
}
```

`EmbedRouteKind` is already the union in `embedTypes.ts` (`episode`, `track`, `clip`,
`chapter`, `official-clip`, `podcast`, `album`, `playlist`, `episode-chapters`). If the import
type differs, use that file's exported union. Do not widen it.

## `resolveEmbedDemoShowcase`

The function is already async and runs on the server. Inside the `flatMap`, after the
`HIDDEN_DEMO_ROUTE_KINDS` check, skip the entry when
`embedDemoRouteOffered(entry.routeKind, getCatalogConfig().musicEnabled)` is false. Call
`getCatalogConfig()` once before the `flatMap`, from `../../lib/catalog/catalogPolicy`. Its
return type is `CatalogConfig`. An entry that fails `isEmbedRouteKind` is still dropped first.

## Tests

`embedDemoMusicRoutes.test.ts`: Music on is true for `album`, `track`, and `podcast`. Music off
is false for `album` and `track`, and true for `podcast`, `clip`, `chapter`, and
`episode-chapters`.

## Release scratchpad

```markdown
## Embed demo page omits album and track when Music is off

- Surfaces: web
- Change: with Music turned off, the embed demo page no longer lists album or track players.
  Episode, clip, chapter, and podcast demos stay.
- Who notices: visitors who open the embed page on an instance with Music turned off
- Operator steps: none
```
