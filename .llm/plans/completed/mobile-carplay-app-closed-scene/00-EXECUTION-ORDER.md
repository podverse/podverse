# Execution order — mobile-carplay-app-closed-scene

Run in sequence. Step 1 may short-circuit Step 2.

| Order | Plan file                              | Purpose                                                | Model    |
| ----- | -------------------------------------- | ------------------------------------------------------ | -------- |
| 1     | `01-verify-dynamic-scene-app-closed.md`| Test if current dynamic scene cold-launches app-closed | Opus 4.8 |
| 2     | `02-dual-scene-adoption-robust-fix.md` | Phone + CarPlay dual scenes (guaranteed fix)           | Opus 4.8 |
| 3     | `03-verify-and-doc-regression-guard.md`| App-closed proof, docs, regression guard, archive      | Opus 4.8 |

## Branching

- **Step 1 result = app-closed CarPlay already works** (dynamic declaration cold-launches with the
  phone app force-quit, phone UI still fine): mark Step 2 **skipped (not needed)** in COPY-PASTA,
  proceed to Step 3 to harden + document + guard.
- **Step 1 result = does NOT cold-launch app-closed**: implement Step 2 (robust dual-scene), then
  Step 3.

## Out of scope

- Podcasts/Music/Queue/History UX-parity IA (later car-ux-parity set).
- CarPlay dashboard / instrument cluster scenes.
- Expo SDK upgrade to a scene-based template (revisit if/when SDK bumps).

## Ship bar (whole set)

Phone app launches normally **and** CarPlay browse+play works with the phone app force-quit —
proven on the CarPlay Simulator, documented in `CARPLAY-SIMULATOR-CHECKLIST.md`.
