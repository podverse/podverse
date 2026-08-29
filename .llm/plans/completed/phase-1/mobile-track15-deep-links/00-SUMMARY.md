# Track 15 — Deep links / universal links

**Phase slug:** `mobile-track15-deep-links`
**Master steps:** 15.1–15.6
**Detail IDs:** 450–455
**Parallel group:** PG-9 (with Tracks 14, 16). **Do first among 14/15** — push tap routing (14.4)
depends on this track's path map + cold-start replay.
**Ship bar:** Universal/App Links open the app to the correct screen; web-parity share URLs;
cold-start deep link replays after auth. Functional — no Track 23 polish.

## Prerequisites (done)

- Track 7.9 linking-config stub (`228-linking-config-stub.md`).
- Track 11.13 now-playing share helper (`358-share-now-playing-link.md`).
- Navigation shell + all detail routes (Tracks 7–13).

## Current state (from exploration)

- RN linking **stub** exists in `apps/mobile/src/navigation/index.tsx` (`mobileNavigationLinking`),
  tab-scoped paths; prefixes `podverse://` + `https://podverse.fm`.
- **Scheme mismatch:** linking prefix `podverse://` vs native scheme `podverse-next`.
- iOS entitlements: CarPlay + App Group only — **no Associated Domains**.
- Android: custom-scheme intent filters only — **no App Links / autoVerify**.
- Web uses flat `id_text` paths; mobile paths are tab-prefixed — needs `getStateFromPath` mapping.
- Cold start: `AppBody` renders `null` while `status === 'unknown'` → linking unmounted; inbound
  links can be dropped until auth resolves.

## Locked decisions

| Topic                | Choice                                                                     |
| -------------------- | -------------------------------------------------------------------------- |
| Domains              | `https://podverse.fm` (+ env/staging) from mobile web-base config          |
| Scheme alignment     | Align prefixes to native `podverse-next://` + `https://podverse.fm`         |
| Id in URLs           | Public `id_text` (matches web), not numeric DB id                          |
| Path translation     | Custom `getStateFromPath` mapping flat web paths → tab-scoped state         |
| Native config path   | Expo config plugin / `app.config.ts` (managed prebuild), not hand-edit only |
| E2E link type        | Custom-scheme URL for determinism (universal-link verify is operator-side)  |

## Model mix

| Model     | Steps                       |
| --------- | --------------------------- |
| Opus 4.8  | 15.4 (cold-start)           |
| Codex 5.3 | 15.1, 15.2, 15.3, 15.5, 15.6 |

## Operator-only (not agent code)

- iOS: enable Associated Domains on App ID; host `apple-app-site-association` on web infra.
- Android: Play Console App Links verification; host `/.well-known/assetlinks.json` (release SHA-256).

## After this phase

- Track 14 push (14.4 tap routing reuses 452 + 453).
