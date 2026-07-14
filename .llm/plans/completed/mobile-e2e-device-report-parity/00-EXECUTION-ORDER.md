# Execution order — mobile-e2e-device-report-parity

| Order | Plan | Detail steps | Notes |
| ----- | ---- | ------------ | ----- |
| 1 | `01-ensure-devices-script.md` | 5.14 / 073 | create/boot helpers |
| 2 | `02-npm-manual-device-defaults.md` | 5.14 / 073 | run-expo-macos + abcmemory |
| 3 | `03-make-e2e-autoboot.md` | 5.15 / 074 | Make + Maestro --device |
| 4 | `04-html-step-screenshot-report.md` | 5.16 / 075 | post-processor |
| 5 | `05-master-plan-ci-docs.md` | 5.14–5.16 | close-out + CI |

Run COPY-PASTA prompts in order (sequential).
