# COPY-PASTA — automatic offline detection (779)

One prompt per response, in order. Order and rationale:
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) · Decisions: [00-SUMMARY.md](00-SUMMARY.md)

**No prerequisites.** `GET /api/v2/health` already exists and `@react-native-community/netinfo` is
already installed and in the prebuilt dev client. No native rebuild is needed for this set.

Select the **Cursor model** and **Reasoning** in the Cursor UI before pasting each prompt. Do not run
tests during these prompts; each response ends with operator verification commands. Mark each box
when its prompt completes.

- [x] **01 — Connectivity machine and store**
- [x] **02 — Sensors and sync wiring**
- [x] **03 — Offline status hook and banner**
- [x] **04 — Downloads and outbox gating**
- [x] **05 — E2E, abcmemory, and closeout**

**03 and 04 may run in parallel** if you are using two agents — they share no files. One agent doing
both should run them in sequence.

---

## 01 — Connectivity machine and store

**Cursor model:** Opus 5
**Reasoning:** high

```
Implement .llm/plans/active/07-mobile-auto-offline-detection/01-connectivity-machine-and-store.md.

Add apps/mobile/src/net/: a pure connectivityMachine.ts (no React Native or Expo imports, clock
passed in) encoding entry debounce, success-only exit, exponential probe backoff with a cap, and
minimum dwell time; connectivity.ts as the live store owning the NetInfo subscription, timers,
reportNetworkOutcome, useConnectivity, and isEffectivelyOffline; connectivityProbe.ts hitting
unauthenticated GET /api/v2/health with a short timeout. Nothing consumes it yet.

connectivityMachine.test.ts is the load-bearing deliverable — cover blip suppression, NetInfo
reconnect alone not exiting, probe-success exit, backoff growth and cap, immediate user-action probe,
dwell-time flicker prevention, and device_offline vs server_unreachable selection.

Follow the locked decisions in 00-SUMMARY.md. Do not run tests; end with operator verification
commands.
```

---

## 02 — Sensors and sync wiring

**Cursor model:** Codex 5.3
**Reasoning:** high

```
Implement .llm/plans/active/07-mobile-auto-offline-detection/02-sensors-and-sync-wiring.md.

Split 502/503/504 out of the reached-the-server bucket in syncErrorClassification.ts behind a new
isServerUnreachable field (keep isOffline meaning "never reached the server"), park the sync queue on
it, report every request outcome from authRequestWithRefresh.ts to reportNetworkOutcome via
classifySyncError, and move the NetInfo subscription out of SyncProvider.tsx so setNetworkReachable
is driven by the derived connectivity state through the existing isSyncNetworkUsable.

The pref gate in authRequestWithRefresh stays pref-only — do NOT gate requests on effective offline,
and do not report OfflineModeEnabledError as a network outcome.

Follow the locked decisions in 00-SUMMARY.md. Do not run tests; end with operator verification
commands.
```

---

## 03 — Offline status hook and banner

**Cursor model:** Codex 5.3
**Reasoning:** medium

```
Implement .llm/plans/active/07-mobile-auto-offline-detection/03-offline-status-and-banner.md.

Add useOfflineStatus() to prefs/offlineMode.ts returning { cause, isForced, isOffline } and re-export
it from prefs/index.ts, leaving isOfflineModeEnabled and useOfflineMode untouched for the ~25
existing call sites. Extend OfflineModeBanner to three states with an exhaustive switch on cause (no
default branch), a distinguishing testID for the auto states, and a polite live region. Add
banner_no_connection and banner_server_unreachable to the settings.offline_mode block in
packages/i18n-catalog/mobile/originals/en-US.json ONLY, as a targeted insertion — CI translates the
other locales. Update offlineModeViews doc comments to state the forced-only boundary.

No navigation steering, no toast/dialog/push, and the More switch keeps showing only the pref.

Follow the locked decisions in 00-SUMMARY.md. Do not run tests; end with operator verification
commands.
```

---

## 04 — Downloads and outbox gating

**Cursor model:** Codex 5.3
**Reasoning:** high

```
Implement .llm/plans/active/07-mobile-auto-offline-detection/04-downloads-and-outbox-gating.md.

Extend the downloadManager module-level offline subscription to pause in-flight transfers on
effective offline and auto-resume when online with the pref off, resuming only transfers this
mechanism paused (add an auto-pause vs user-pause distinction on the store record if one is missing).
Gate both isOfflineModeEnabled checks in playbackOutboxRepository.drain on isEffectivelyOffline,
leaving undelivered rows queued.

downloadManager.enqueue stays pref-only (a new download queues under auto-offline), and
resolvePlaybackUrl stays pref-only so remote streaming still works. Nothing new on a progress tick.

Follow the locked decisions in 00-SUMMARY.md. Do not run tests; end with operator verification
commands.
```

---

## 05 — E2E, abcmemory, and closeout

**Cursor model:** Codex 5.3
**Reasoning:** medium

```
Implement .llm/plans/active/07-mobile-auto-offline-detection/05-e2e-docs-and-closeout.md.

Extend apps/mobile/e2e/offline-mode.yaml for the manual and server-unreachable banners, documenting
in comments what the harness cannot produce rather than writing assertions that pretend to cover it.
Rewrite the toggle-only language in .cursor/rules/mobile-offline-mode.mdc around the three concepts
and fix the matching line in mobile-sync-orchestration.mdc. Note the superseded activation decision
in detail 742, flip 779 to done, index 779 under P2.1.10 and in the Appendix of the Phase 2 master
plan, then archive this set and update LLM-PLANS-ACTIVE.md and COPY-PASTA-RUN-ORDER.md.

Assume I ran every earlier prompt without testing: end the response with ALL cumulative verification
commands for the whole set, deduped, build -> lint -> unit -> mobile Maestro, naming the Metro / iOS /
Android / E2E API prerequisites in prose rather than in the paste block.
```
