# 02 — Queue add next/last + move to history

Implement master steps **10.6–10.7**.

## Detail docs

- [315-queue-add-next-last](/docs/proposals/mobile/_master-plan_/details/315-queue-add-next-last.md)
- [316-queue-move-to-history](/docs/proposals/mobile/_master-plan_/details/316-queue-move-to-history.md)

## Tasks

1. Extend `queueRepository` with add-next / add-last mutations using the same POST wrappers as web;
   update store + call `projectQueueSnapshotToNativeCache`.
2. Replace `runQueueAction` in `useHomeRowPlaybackStub` consumers with real queue mutations (play
   may still be stub until prompt 04).
3. Implement move now-playing → history API used by orchestrator on ended/skip (wire consumer in
   04 if orchestrator not yet present — land repo+store API here).
4. Mark **10.6–10.7** / **315–316** `done`.

## Acceptance

- Add next/last updates upcoming (auth sync when logged in)
- History list reflects moves after local write
- Projection hook fires once per successful mutation

Do not run tests during agent work.
