# Missed doc links — follow-up (done)

> **Resolution (2026-08-05): OBSOLETE — already fixed.** `infra/k8s/alpha/examples/optional-extension-metrics/README.md`
> no longer contains the broken `../../common/source/extensions.env` relative link; it now uses the
> canonical repo-root link `/infra/k8s/base/common/source/extensions/extensions.env` (line ~16). No
> `../../` relative links remain in that file. Archived to `completed/` with no further action.

First pass: ~590+ links → repo-root `/…`. This pass closed the tail.

## Fixed

| Repo | What |
| --- | --- |
| Podverse | `optional-extension-metrics/README.md` → `/infra/k8s/base/common/source/extensions/extensions.env` |
| Metaboost | 9 `docs/` + `INFRA-K8S.md` wrong paths |
| Metaboost | 15 completed-plan stale links (`publish-staging`, canonical-terms, exports, cross-repo prose) |

## Frozen (by scope)

- `.llm/history/**` — 17 links unchanged

## Verify

```bash
rg '\]\(\.\./' --glob '*.{md,mdc}' --glob '!.llm/history/**'
node scripts/development/normalize-markdown-links.mjs --verify
```

Expected: no matches outside `.llm/history/`.
