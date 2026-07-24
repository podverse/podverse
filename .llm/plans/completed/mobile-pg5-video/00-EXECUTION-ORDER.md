# PG-5 execution order

Run COPY-PASTA prompts **in sequence**. Do not start the next prompt until the previous is
finished (mark master-plan steps `done` after each). Within a prompt, iOS and Android native work
may be parallelized across two agents only when the plan file says so.

| Order | Plan file                                 | Steps                | Model    |
| ----- | ----------------------------------------- | -------------------- | -------- |
| 1     | `01-native-video-and-surface-hosts.md`    | 2.14–2.17            | Opus 4.8 |
| 2     | `02-bridge-attach-animate-reparent.md`    | 2.18–2.20            | Opus 4.8 |
| 3     | `03-rn-targets-hide-orientation.md`       | 2.21–2.24            | Opus 4.8 |
| 4     | `04-load-start-file-errors.md`            | 2.25–2.27            | Opus 4.8 |
| 5     | `05-serialization-tests-and-fdroid.md`    | 2.28, 2.31           | Codex 5.3 |
| 6     | `06-e2e-audio-and-video-transition.md`    | 2.32–2.33            | Opus 4.8 |

**Reconciled outside COPY-PASTA:** 2.29 (README), 2.30 (abcmemory) → already `done`.

**Follow-on (not this set):** Track 11.3 / 11.6–11.8 / 11.15–11.17 video UI + E2E details.
