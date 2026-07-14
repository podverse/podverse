# COPY-PASTA — PG-3 CI/CD + mobile E2E

Detailing complete. Paste prompts **one at a time** to **implement**. After each prompt, mark
listed steps **`done`** (Tracks + Appendix C + detail headers). Do not run tests during agent work.

Open decisions (locked): **EAS** + **Maestro** — see `00-SUMMARY.md`.

## Step 1 — E2E framework + layout — done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/completed/mobile-pg3-ci-e2e/01-e2e-framework-and-layout.md.
Implement steps 5.1, 5.2, 5.12, 5.13 (details 060, 061, 071, 072). Lock Maestro. Mark done when complete.
Do not run tests during agent work; end with operator verify commands.
```

## Step 2 — Hello-world flow + screenshots — done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/completed/mobile-pg3-ci-e2e/02-e2e-hello-world-screenshots.md.
Implement steps 5.3–5.5 (details 062–064). Mark done when complete.
```

## Step 3 — Makefile + docs + skill — done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/completed/mobile-pg3-ci-e2e/03-e2e-makefile-docs-skill.md.
Implement steps 5.6, 5.7, 5.11 (details 065, 066, 070). Mark done when complete.
```

## Step 4 — Rule + CI stub + env doc — done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/completed/mobile-pg3-ci-e2e/04-e2e-rule-ci-env.md.
Implement steps 5.8–5.10 (details 067–069). Mark done when complete.
```

## Step 5 — CI tooling + costs — done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/completed/mobile-pg3-ci-e2e/05-ci-tooling-and-costs.md.
Implement steps 4.1–4.3 (details 150–152). Lock EAS. Mark done when complete.
```

## Step 6 — Store identity — done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/completed/mobile-pg3-ci-e2e/06-store-identity-isolation.md.
Implement steps 4.11–4.13 (details 160–162). Mark done when complete.
```

## Step 7 — Workflows + isolation — done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/completed/mobile-pg3-ci-e2e/07-mobile-workflows-isolation.md.
Implement steps 4.4–4.7 (details 153–156). Mark done when complete.
```

## Step 8 — Runners + signing — done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/completed/mobile-pg3-ci-e2e/08-runners-and-signing.md.
Implement steps 4.8–4.10 (details 157–159). Mark done when complete.
```

## Step 9 — Branches + versions — done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/completed/mobile-pg3-ci-e2e/09-branch-channels-versions.md.
Implement steps 4.14–4.18 (details 163–167). Mark done when complete.
```

## Step 10 — OTA + profiles + metadata — done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/completed/mobile-pg3-ci-e2e/10-ota-profiles-metadata.md.
Implement steps 4.19–4.21 (details 168–170). Mark done when complete.
```

## Step 11 — Runbook + convergence gate — done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/completed/mobile-pg3-ci-e2e/11-runbook-artifacts-convergence.md.
Implement steps 4.22–4.25 (details 171–174). Mark done when complete. Archive the plan set when PG-3 is finished.
```

## Final verification (after all steps)

**Cursor model:** Auto

```text
Confirm steps 4.1–4.25 and 5.1–5.13 are done in docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md.
Provide cumulative operator verification commands for PG-3 (Make mobile_e2e_*, workflow file checks).
```
