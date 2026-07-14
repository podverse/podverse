# 114-engine-native-cache-hooks

**Master step:** 2.35
**Model (author + implement):** Opus 4.8
**Status:** done (contract/stubs; storage 12.2–12.3 deferred)

## Scope (split)

### In PG-2b (this detailing / early implementation)

- **Contract only:** document the native-cache write surface the engine (and later queue stores)
  must expose so Track 12 can read queue / downloads / library **without JS**.
- Reserve named module methods (stubs allowed) and TypeScript types so phone UI work cannot invent
  a parallel cache.
- Point schema ownership to Track **12.1**
  ([380-native-cache-schema](/docs/proposals/mobile/_master-plan_/details/380-native-cache-schema.md))
  — do not invent a throwaway schema that Track 12 replaces.

### Deferred (after gate + queue write path)

- Full durable storage (iOS App Group / Android Room or SharedPreferences) — **12.2 / 12.3**
- JS calling writes on every queue/auto-queue/download mutation — **10.22 / 12.4**
- Prove native read with JS dead — **12.5 / 12.6**

## Product requirement

Seamless CarPlay / Android Auto (“get in the car, browse and play, phone app never opened”) is
**non-negotiable**. This step exists so the media engine does not ship without a place for JS to
mirror state into native storage. Without these hooks, Track 12 cannot meet that bar without a
rewrite.

## Reserved API (contract)

| Method (JS → native)      | Payload (v0 draft)                          | Reader                        |
| ------------------------- | ------------------------------------------- | ----------------------------- |
| `writeQueueSnapshot`      | now-playing + upcoming item ids/titles/urls | Car skip/advance, now-playing |
| `writeDownloadsIndex`     | local `file://` paths + metadata            | Offline car browse            |
| `writeLibraryBrowseIndex` | podcast/playlist list for templates         | Car browse roots              |

- Payloads are JSON strings or typed maps; final field list owned by **12.1**.
- Native may no-op persist in the audio spike if stubs log only — but **signatures must exist**.
- Policy stays in `@podverse/playback-core`; native stores opaque snapshots, does not re-decide
  queue rules.

## Architecture notes

- See [.cursor/rules/mobile-carplay-android-auto.mdc](/.cursor/rules/mobile-carplay-android-auto.mdc).
- Engine owns **transport**; cache hooks are co-located on the same module so car services and the
  player share one native package boundary.
- Do not put car browse trees in JS.

## Acceptance criteria (PG-2b contract portion)

- Step 2.35 marked `done` when: module README (or linked APPS-MOBILE section) documents the three
  write methods; TypeScript + native stub method names exist (no-op persist OK)
- Explicit “not seamless yet” note: seamless acceptance is **12.5–12.6** and **12.17–12.18**
- Full durable storage (12.2–12.3) and JS call sites (10.22 / 12.4) remain later work — stubs do not
  imply those are complete

## Web parity references

- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- Track 12 steps 12.1–12.6, 12.17–12.18

## Verification

```bash
rg -n 'writeQueueSnapshot|writeDownloadsIndex|writeLibraryBrowseIndex|native cache' apps/mobile docs/proposals/mobile/_master-plan_/details/114-engine-native-cache-hooks.md
```
