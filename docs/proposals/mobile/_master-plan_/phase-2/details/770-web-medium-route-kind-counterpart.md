# 770-web-medium-route-kind-counterpart

**Master step:** P2.5.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Web counterpart to [760](760-shared-medium-route-kind.md): consume the shared `getChannelRouteKind`
and record known gaps that this medium work does **not** close.

### Adopt shared helper

In [`redirectToChannelPageByMedium.ts`](apps/web/src/utils/redirect/redirectToChannelPageByMedium.ts):

- Delete the local `getChannelRouteKind` implementation.
- Re-export or import `getChannelRouteKind` / `ChannelRouteKind` from `@podverse/helpers`.
- Keep `getChannelPathByMedium`, `getItemPathByMedium`, and the redirect helpers as web-local
  wrappers over `ROUTES`.

Update `redirectToChannelPageByMedium.test.ts` and any imports that type on the local
`ChannelRouteKind`.

### Recorded gaps (do not close)

| Gap                         | Why it stays                                                                 |
| --------------------------- | ---------------------------------------------------------------------------- |
| Web `/videos` page          | Still "Coming soon"; product has not decided a video browse tree for web     |
| `/video/[id]` / `/channel/` | Notification path prefixes only; no Next pages                               |
| Clip editor queue hold      | Web advance path is `useQueueResourcesLoadActive`, not shared `resolveQueueAdvance` — tracked with Make Clip (756), not this set |

Mobile Browse keeps a `videos` chip while web's sidebar has no Videos link. That asymmetry is
**intentional** for this phase: Home on both surfaces lumps video under podcasts / `av`.

### Out of scope

- Building a real `/videos` list or video channel pages.
- Changing home dropdown medium options on web.
- Alternate-enclosure or player changes on web (already ship).

## Acceptance criteria

- Web redirects and path helpers use shared `getChannelRouteKind`.
- `/videos` remains a placeholder; documented in the plan set summary as a known gap.
- No new video routes or browse UI on web.

## Web parity references

- [`apps/web/src/app/videos/page.tsx`](apps/web/src/app/videos/page.tsx)
- [760](760-shared-medium-route-kind.md)

## Verification

```bash
# Root
npm run test -w apps/web -- redirectToChannelPageByMedium
```
