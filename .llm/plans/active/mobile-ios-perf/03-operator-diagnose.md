# 03 — Operator diagnosis on real library

**Cursor model:** Codex 5.3
**Reasoning:** medium

## Goal

Accept or reject H1–H5 with numbers from the operator's real library on `"iPhone 17 Pro"`.

## Variants (arm → stop → gesture → collect)

| Variant | Metro / build | Gesture flag |
| ------- | ------------- | ------------ |
| Home chips ×3 | `mobile:dev:perf` | `--gesture chips` |
| Browse chips ×3 | same | `--gesture browse-chips` |
| Episodes fling ×3 | same | `--gesture scroll` |
| Images off: chips + fling ×1 each | `mobile:dev:perf:noimages` | matching gesture |
| Fling + profile ×1 | `mobile:dev:perf` | `--gesture scroll --profile` |
| Release build ×1 chips + fling | Release with perf env baked in; no Metro | same gestures |
| Seeded E2E twin remote images | E2E stack + `PODVERSE_E2E_PERF_REMOTE_IMAGES=1` | seeded `perf-report --device ios` |

Fling gesture: six swipes up, six down on Home Episodes.

## Output

Findings table in `MOBILE-PERF-BASELINES.md`: each hypothesis accepted or rejected with the numbers that decided it. Note whether seeded remote images reproduce the real-library stall (feeds 05).
