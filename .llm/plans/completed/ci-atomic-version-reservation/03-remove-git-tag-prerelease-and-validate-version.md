# 03 — Remove `git-tag-prerelease` and the `validate` version-calc step (podverse)

## Scope

After Phase 1 has shipped and the new `reserve-version` job is verified working
on a real `alpha` run, clean up the legacy bits in
[.github/workflows/publish-alpha.yml](../../../../.github/workflows/publish-alpha.yml):

1. Delete the `git-tag-prerelease` job.
2. Delete the `Calculate unified version` step from `validate` and remove
   `version` / `float_tag` / `is_prod` from `validate.outputs`.
3. Remove `git-tag-prerelease` and `validate` from any remaining `needs:` lists
   where they no longer contribute outputs.

## Edits

### Delete `git-tag-prerelease` (entire job)

Remove the job currently defined at lines ~388–447 of the workflow
(`git-tag-prerelease:` through the end of its `script:` block).

### Update `github-prerelease-create.needs`

```yaml
  github-prerelease-create:
    needs: [reserve-version, verify-published-tags]
```

### Update `changelog-pr-to-develop.needs`

```yaml
  changelog-pr-to-develop:
    needs: [github-prerelease-create, reserve-version, verify-published-tags]
```

### Trim `validate`

```yaml
  validate:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: read
    # outputs: removed; reserve-version now provides version/float_tag/is_prod
    steps:
      - uses: actions/checkout@v6
      - name: Setup Node.js
        ...
      - name: Build all apps
        run: npm run build:apps
      # `Calculate unified version` step is removed in this commit.
```

Delete the entire `Calculate unified version` step (currently lines ~58–215) and
the `outputs:` block at the top of the job.

## Optional safety net

If you want a read-only sanity check instead of fully removing the tag job, you
can keep a minimal verifier that resolves
`refs/tags/${{ needs.reserve-version.outputs.version }}` and asserts it equals
`${{ github.sha }}` (no createRef/move). Not recommended unless we hit a real
issue.

## Key files

- [.github/workflows/publish-alpha.yml](../../../../.github/workflows/publish-alpha.yml)

## Verification (this step)

Push to `alpha`. Expect:

- `validate` no longer runs the long version-calculation step (faster job).
- `git-tag-prerelease` no longer appears in the run graph.
- `reserve-version` is the only place a Git tag is created.
- All downstream jobs succeed with the same `version` they had pre-cleanup.
