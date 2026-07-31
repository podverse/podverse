# Execution order — mobile-pg8-car-carplay

Run COPY-PASTA prompts **in sequence**. Scene/config before browse; browse before now-playing;
now-playing/remotes before simulator docs archive.

| Order | Plan file                                 | Steps                         | Model              | Notes |
| ----- | ----------------------------------------- | ----------------------------- | ------------------ | ----- |
| 1     | `01-carplay-scene-app-group.md`           | 12.7, 12.16 (iOS wiring)      | Opus 4.8 / Codex 5.3 | Scene + entitlements + App Group id in code |
| 2     | `02-carplay-browse-library-downloads.md`  | 12.8                          | Opus 4.8           | CPListTemplate Library + Downloads from cache |
| 3     | `03-carplay-now-playing-remotes-play.md`  | 12.9, 12.10 (+ play URL parity) | Opus 4.8         | Shared AVPlayer + remotes + play from cache |
| 4     | `04-carplay-simulator-checklist-qa.md`    | 12.18, 12.19 (iOS)            | Auto               | Checklist + runbook; archive set |

**Detail docs:** 386, 387, 388, 389, 395 (iOS), 397; touch 398 for iOS QA note.

**Out of this set:** Podcasts/Music/Queue/History UX parity, 12.22 directory follows, CarPlay video,
prod bundle id `com.podverse.fm` convergence.
