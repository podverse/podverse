# 184-post-release-monitoring

**Master step:** 22.10
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Define the **post-release monitoring checklist**: what to watch after a mobile release to catch
regressions early.

## Checklist

- **Crash analytics:** crash-free users/sessions rate (per platform, per version).
- **API error rates:** 4xx/5xx from mobile clients — use the client-version header (180) to slice by
  app version server-side.
- **Playback health:** start failures, stalls, download failures (key mobile flows).
- **Store vitals:** Play Android vitals (ANRs), App Store crash reports.
- **Rollout gates:** ramp only while metrics are green (181); halt + rollback (182) on regression.

## Acceptance criteria

- Checklist covers crashes, API errors (sliced by client version), playback, and store vitals, tied
  to rollout/rollback gates.

## Web parity references

- Client-version header (180) for server-side version slicing; observability skill for metrics.

## Verification

- Doc-only; operationalized with the analytics stack at release.
