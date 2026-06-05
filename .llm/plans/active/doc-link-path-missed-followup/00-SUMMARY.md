# Missed doc links — follow-up (done)

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
