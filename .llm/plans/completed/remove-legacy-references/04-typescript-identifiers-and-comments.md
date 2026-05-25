# Plan 04 — TypeScript identifiers and comments

## Objective

Rename **repo-owned** symbols and rewrite comments. Leave third-party option keys unchanged (plan 01 exclusions).

## Renames (suggested — adjust if clearer names exist)

| Current | Suggested | Files |
| ------- | --------- | ----- |
| `getLegacyMembership403ModalProps` | `getMembership403ModalPropsFromApiMessage` | `apps/web/src/utils/membership/modalForMembership403.tsx`, `ListChannelSettings.tsx`, `PodcastIndexFeedInfo.tsx` |
| `LEGACY_EPISODES_STORE` etc. | `PRIOR_SCHEMA_EPISODES_STORE` or `V4_EPISODES_STORE` | `apps/web/src/utils/addByRSS/storage.ts` |
| `isLegacyJwt` | `usesJwtStringOverload` or `isJwtStringParam` | `packages/management-api-requests/src/apiRequestService.ts` |

Update JSDoc on renamed exports; keep behavior identical.

## Comments-only (no API rename)

| File | Rewrite |
| ---- | ------- |
| `apps/management-web/next.config.mjs` | “Redirects from prior `/dashboard/` routes” |
| `apps/web/src/styles/globals/pageAdjust.scss` | “100vh first (fallback), then 100dvh” |
| `packages/ui/src/styles/_variables-root.scss` | “compatibility aliases” |
| `packages/ui/.../LookupFieldGrid.tsx` | “optional label row above controls” |
| `packages/orm/.../credentialsEncryption.ts` | “unencrypted plaintext” |
| `packages/helpers/.../addByRSSResourceMergedArtworkCandidates.ts` | “prepend `channel_image_url` when distinct” |
| `packages/helpers-backend/.../redactForLog.test.ts` | “older DTO field paths” |
| `packages/v4v-metaboost/...test.ts` | “deprecated field minimum_message_amount_minor” |
| `packages/helpers/.../imageCandidates.test.ts` | rename local var `legacy` → `channelImageUrl` |
| `infra/k8s/.../annotations.patch.yaml` | “prometheus.io pod annotations for scrapers without PodMonitor” |
| `infra/k8s/scripts/.../create_argocd_github_repo_secret.sh` | “fixed secret name override” |
| `scripts/database/generate-linear-baseline.sh` | “uncompressed combined debug output” |

## Do not change

- `legacyHeaders: false` in `rateLimiter.ts`
- `legacyWatch` in `nodemon.json`
- SQL path `0027_feed_legacy_flag_drop.sql` in kustomization

## Tests

After renames:

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run test:unit
```

Run web unit tests if membership or addByRSS tests exist for touched modules.

## Deliverables

- [ ] All in-scope app/package/infra/script matches addressed
- [ ] Lint passes
- [ ] No broken imports from renamed exports

## Verification

```bash
rg -i '\blegacy\b' apps packages scripts infra \
  --glob '!**/.llm/**' \
  --glob '!**/linear-migrations/**' \
  --glob '!package-lock.json' \
  --glob '!tools/web-perf/lighthouse/reports/**' \
  --glob '!flake.nix' \
  --glob '!apps/web/nodemon.json' \
  --glob '!apps/api/src/lib/rateLimiter.ts'
```

Expected: **no matches** (or only documented exclusions).
