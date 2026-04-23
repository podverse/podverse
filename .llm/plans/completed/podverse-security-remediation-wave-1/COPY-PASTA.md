# Podverse Security Remediation Wave 1 - Copy-Pasta Prompts

## Critical Execution Rules

- Phases are sequential: finish all of Phase 1 before Phase 2, and Phase 2 before Phase 3.
- Within each phase, run prompts in order unless explicitly marked parallel.
- Do not edit plan files; implement code and tests only.

## How to Use

1. Copy one prompt block below into an agent.
2. Wait for completion and verification output.
3. Move to the next prompt.

---

## Phase 1 - P0 Critical Fixes

### Prompt 1

```text
Read and execute:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/01-management-api-authz-scope.md

Implement exactly what the plan specifies, including tests and verification commands.
Do not edit plan markdown files.
```

### Prompt 2

```text
Read and execute:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/02-parser-ssrf-and-response-guardrails.md

Implement exactly what the plan specifies, including tests and verification commands.
Do not edit plan markdown files.
```

---

## Phase 2 - P1 Core Hardening

### Prompt 3

```text
Read and execute:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/03-orm-stats-query-hardening.md

Implement exactly what the plan specifies, including tests and verification commands.
Do not edit plan markdown files.
```

### Prompt 4

```text
Read and execute:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/04-auth-token-policy.md

Implement exactly what the plan specifies, including tests and verification commands.
Do not edit plan markdown files.
```

### Prompt 5

```text
Read and execute:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/05-api-validation-strictness.md

Implement exactly what the plan specifies, including tests and verification commands.
Do not edit plan markdown files.
```

### Prompt 6

```text
Read and execute:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/06-logging-redaction-hardening.md

Implement exactly what the plan specifies, including tests and verification commands.
Do not edit plan markdown files.
```

### Prompt 7

```text
Read and execute:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/07-management-dashboard-server-auth-gate.md

Implement exactly what the plan specifies, including tests and verification commands.
Do not edit plan markdown files.
```

---

## Phase 3 - P2 Defense in Depth

### Prompt 8

```text
Read and execute:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/08-query-load-guardrails.md

Implement exactly what the plan specifies, including tests and verification commands.
Do not edit plan markdown files.
```

### Prompt 9

```text
Read and execute:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/09-web-safe-url-policy.md

Implement exactly what the plan specifies, including tests and verification commands.
Do not edit plan markdown files.
```

---

## Phase 4 - Finalization Prompt

### Prompt 10

```text
Using the completed implementation work from Wave 1, perform final verification:

1) Run baseline verification from:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/00-master-plan.md

2) Update findings tracker statuses in:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-audit-sqli-attack-surface/security-findings-tracker.md
from open -> resolved or accepted_risk with short rationale per finding.

3) Add a concise remediation summary note at:
/Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/podverse-security-remediation-wave-1/10-remediation-summary.md
covering what was fixed, what remains, and residual risk.
```
