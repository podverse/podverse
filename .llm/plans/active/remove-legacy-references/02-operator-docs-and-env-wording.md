# Plan 02 — Operator docs and env wording

## Objective

Remove **legacy** from contributor/operator-facing documentation and env comments. Describe **current** keys and behavior only.

## Files (known matches — re-grep if baseline grew)

| File | Action |
| ---- | ------ |
| [docs/development/REBRANDING-CDN.md](../../../docs/development/REBRANDING-CDN.md) | “older browsers” instead of “legacy browsers”; “ICO favicon” instead of “Legacy tab icon”; `BRAND_COLOR_BACKGROUND` as **alternate** key, not “legacy:” |
| [docs/development/env/LOCAL-ENV-OVERRIDES.md](../../../docs/development/env/LOCAL-ENV-OVERRIDES.md) | Same for `BRAND_COLOR_BACKGROUND` row |
| [apps/web/ENV.md](../../../apps/web/ENV.md) | `BRAND_BACKGROUND_COLOR` docs: alternate key `BRAND_COLOR_BACKGROUND` |
| [apps/management-web/ENV.md](../../../apps/management-web/ENV.md) | Same |
| [scripts/local-env/setup.sh](../../../scripts/local-env/setup.sh) | Comment near brand.env mapping (~line 454) |
| [docs/repo-management/BRANCH-PROTECTION.md](../../../docs/repo-management/BRANCH-PROTECTION.md) | Remove or rewrite **Legacy:** paragraph — use “Previous documentation” or delete if redundant |

## Wording pattern (brand env)

**Do:**

```markdown
For local `brand.env`, set **`BRAND_BACKGROUND_COLOR`**. The setup script also accepts **`BRAND_COLOR_BACKGROUND`** as an alternate key and maps it to `NEXT_PUBLIC_BRAND_BACKGROUND_COLOR` in the sidecar.
```

**Do not:** `(legacy: BRAND_COLOR_BACKGROUND)`, “formerly”, “renamed from”.

## `docs/operations/`

Re-grep `docs/operations` — platform docs should already avoid legacy after platform reorg. Fix any stragglers (e.g. “legacy prom-client” if reintroduced).

## `dev/env-overrides/local/brand.env.example`

If the example mentions legacy, align with canonical `BRAND_BACKGROUND_COLOR` naming.

## Deliverables

- [ ] All `docs/` matches (per plan 01 exclusions) resolved
- [ ] Both `ENV.md` files updated
- [ ] `setup.sh` comment updated

## Verification

```bash
rg -i '\blegacy\b' docs apps/web/ENV.md apps/management-web/ENV.md scripts/local-env --glob '!**/.llm/**'
```

Expected: **no matches**.
