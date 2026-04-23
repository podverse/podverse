# 04 — `changelog-pr-to-develop` auth fix (podverse)

## Scope

Apply the same `Duplicate header: Authorization` fix to
[.github/workflows/publish-alpha.yml](../../../../.github/workflows/publish-alpha.yml)
that metaboost has already shipped. Without this, the `Open pull request` step in
`changelog-pr-to-develop` can fail with HTTP 400 because both `actions/checkout`
and `peter-evans/create-pull-request` configure HTTPS auth headers.

## Edits

### `Check out develop` step

```diff
       - name: Check out develop
         uses: actions/checkout@v6
         with:
           ref: develop
+          # Avoid duplicate Authorization on HTTPS (checkout extraheader + create-pr creds) -> HTTP 400.
+          persist-credentials: false
```

### `Open pull request` step

```diff
       - name: Open pull request
         uses: peter-evans/create-pull-request@v6
         with:
+          token: ${{ secrets.GITHUB_TOKEN }}
           commit-message: "chore: archive changelog for ${{ github.ref_name }} ${{ needs.reserve-version.outputs.version }}"
           title: "chore: archive changelog for ${{ needs.reserve-version.outputs.version }} (${{ github.ref_name }})"
           ...
```

## Notes

- This step assumes Phase 1 (`02-rewire-needs-and-outputs.md`) has already
  rewritten the version interpolations in this job to
  `needs.reserve-version.outputs.version`. If you're applying these out of order,
  keep `needs.validate.outputs.version` until the rewire commit lands.
- No other steps in `changelog-pr-to-develop` need to change.

## Key files

- [.github/workflows/publish-alpha.yml](../../../../.github/workflows/publish-alpha.yml)

## Verification (this step)

After push to `alpha`, the `Open pull request` step succeeds and a PR titled
`chore: archive changelog for X.Y.Z-alpha.N (alpha)` is opened against `develop`.
No `Duplicate header: Authorization` errors in logs.
