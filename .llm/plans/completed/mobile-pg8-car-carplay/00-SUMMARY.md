# PG-8 (slice 3) — iOS CarPlay at Android Auto parity

**Phase slug:** `mobile-pg8-car-carplay`
**Master steps:** 12.7–12.10, 12.16 (iOS code wiring), 12.18, 12.19 (iOS QA note)
**Detail IDs:** 386, 387, 388, 389, 395 (iOS), 397; refresh 398 iOS portion
**Parallel group:** PG-8 (Track 12) — **third slice** (after native-cache + Android Auto)
**Ship bar:** CarPlay browses **Library + Downloads** from the durable native cache and plays
through **`PodverseAudioEngine.shared`** with the phone app force-quit (Simulator-proven). Match
today’s Android Auto scaffold — **not** the Podcasts/Music/Queue/History UX-parity redesign.

## Why now

- Operator portal for Next is complete: App ID `com.podverse.app.next`, CarPlay Audio capabilities,
  App Group `group.com.podverse.app.next` (no new contact-form request needed — team already had
  CarPlay on `com.podverse.fm`).
- Android Auto Library/Downloads + play is done (`mobile-pg8-car-android-auto`, archived).
- iOS still has cache + AVPlayer/now-playing only — no CarPlay scene/templates.

## Prerequisites (done)

- Native cache 12.1–12.6
- Shared `PodverseAudioEngine` + `MPRemoteCommandCenter` (Track 2)
- Android browse/play as behavioral reference (details 391, 393, 394)
- Operator App ID / CarPlay / App Group for `.next`

## Locked decisions

| Topic              | Choice                                                                      |
| ------------------ | --------------------------------------------------------------------------- |
| Bundle id          | `com.podverse.app.next` (keep separate from prod `com.podverse.fm`)         |
| App Group          | `group.com.podverse.app.next`                                               |
| Browse IA (v1)     | **Library** + **Downloads** only (AA parity)                                |
| UX-parity proposal | Deferred — [car-ux-parity](/docs/proposals/mobile/car-ux-parity/000-OVERVIEW.md) |
| Play               | Shared `PodverseAudioEngine.shared`; offline `file://` preferred            |
| Remotes            | One `MPRemoteCommandCenter` on the engine — no second registration          |
| Proof              | CarPlay Simulator checklist (12.18)                                         |

## Model mix

| Model     | Steps                                      |
| --------- | ------------------------------------------ |
| Opus 4.8  | 12.7–12.10 (native scene / templates / play / remotes) |
| Codex 5.3 | 12.16 iOS code-wiring notes / entitlement doc refresh  |
| Auto      | 12.18 checklist polish + 12.19 iOS QA note            |

## After this slice

- Operator runs Simulator checklist.
- Later: car-ux-parity (Podcasts/Music/Queue/History) + 12.22 directory follows.
