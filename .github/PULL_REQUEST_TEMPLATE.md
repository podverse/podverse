## Description

<!-- What does this PR do? -->

## Related Issue

<!-- Link to GitHub issue: Fixes #123 or Closes #123 -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist

- [ ] Code compiles without errors
- [ ] Linting passes (`npm run lint`)
- [ ] I have tested my changes
- [ ] Documentation updated if needed

## OpenAPI Evidence (Required For Route/Contract/Auth Changes)

If this PR changes API route behavior, auth semantics, validators, or request/response contracts, complete all items below. Missing evidence is a merge blocker.

- [ ] I ran `./scripts/nix/with-env npm run openapi:check` and pasted the result summary below
- [ ] I mapped each changed route to OpenAPI path+method+operationId below
- [ ] I documented 401 vs 403 behavior notes for changed protected endpoints below
- [ ] If no spec edit was required for a route-related change, I included explicit justification below

### OpenAPI Check Result

<!-- Paste validator/lint/bundle summary -->

### Route Parity Mapping

<!-- source route -> OpenAPI path/method -> operationId -->

### Auth Notes (401 vs 403)

<!-- Required for changed protected endpoints -->

### No-Spec-Change Justification

<!-- Required only when route behavior changed but no spec files were edited -->

## LLM Development (Optional)

If you maintain optional notes under `.llm/history/`, see [.llm/LLM.md](.llm/LLM.md). When a PR merges to `develop`, a workflow may archive matching feature folders under `.llm/history/active/` to `.llm/history/completed/`.

## CI

> **Note**: A maintainer will comment `/test` to run CI checks on this PR.

> **OpenAPI policy**: For route/contract/auth changes, OpenAPI evidence above is required before merge.

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->
