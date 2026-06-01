# 01 — Podverse optional-extension-metrics link

## File

`infra/k8s/alpha/examples/optional-extension-metrics/README.md` (line ~16)

## Problem

```markdown
[`common/source/extensions.env`](../../common/source/extensions.env)
```

Resolves to `infra/k8s/alpha/common/source/extensions.env` — **file does not exist**.

## Fix

Replace with repo-root link to canonical source:

```markdown
[`extensions.env`](/infra/k8s/base/common/source/extensions/extensions.env)
```

Or remove if redundant with line 23 (`/infra/k8s/base/extensions/source/`).

## Verify

From Podverse repo root:

```bash
test -f infra/k8s/base/common/source/extensions/extensions.env
rg '\]\(\.\./' infra/k8s/alpha/examples/optional-extension-metrics/README.md
```
