# 452-deep-link-path-map

**Master step:** 15.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Map **flat web URL paths** to mobile screens so universal/App Links and custom-scheme URLs
  resolve to the correct tab-scoped route. Web uses flat `id_text` paths; mobile linking is
  tab-prefixed.
- Resource paths to map (all keyed by public `id_text`, not numeric DB id):
  - `/podcast/:id_text` → PodcastDetail
  - `/episode/:id_text` → EpisodeDetail
  - `/clip/:id_text` → ClipDetail
  - `/playlist/:id_text` → PlaylistDetail (My Library stack)
  - `/profile/:id_text` → MorePublicProfile
  - `/album|/artist|/track/:id_text` → respective detail
- Add a custom `getStateFromPath` (and/or `getPathFromState`) in
  `apps/mobile/src/navigation/index.tsx` `mobileNavigationLinking` to translate flat web paths into
  the tab-scoped state, choosing a default host tab (e.g. Home for content, My Library for playlist,
  More for profile).
- **Fix the scheme mismatch:** align linking `prefixes` with the native scheme (`podverse-next://`)
  plus `https://podverse.fm`, keeping legacy `podverse://` only if still needed.

## Acceptance criteria

- Opening `https://podverse.fm/podcast/<id_text>` (and each resource above) routes to the correct
  detail screen with the `id_text` param.
- Flat web paths resolve without requiring the tab prefix.
- Custom-scheme URLs still work; scheme prefixes match native config from 450/451.

## Web parity references

- `apps/web/src/constants/routes.ts` (path patterns).
- `apps/web/src/components/Modal/ModalShare.tsx` (share URL shapes).
- `apps/mobile/src/navigation/index.tsx` (`mobileNavigationLinking`, existing route paths).

## Verification

```bash
grep -rq "getStateFromPath\|podverse.fm" apps/mobile/src/navigation
npm run test -w apps/mobile
```
