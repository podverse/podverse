# 02 — Rewire `needs:` and `outputs:` to `reserve-version` (podverse)

## Scope

Repoint every downstream job in
[.github/workflows/publish-alpha.yml](../../../../.github/workflows/publish-alpha.yml)
that currently reads `needs.validate.outputs.{version,float_tag,is_prod}` so that
it reads `needs.reserve-version.outputs.*` instead, and add `reserve-version` to
each job's `needs:` list.

`validate.outputs.*` stay defined for now (cleaned up in `03-...`); only the
**consumers** change. This keeps the diff reviewable and reversible.

## Changes

### `publish-base-images`

```yaml
  publish-base-images:
    needs: [validate, reserve-version]
    ...
      - name: Get unified version
        id: version
        run: |
          echo "VERSION=${{ needs.reserve-version.outputs.version }}" >> $GITHUB_OUTPUT
          echo "Using unified version: ${{ needs.reserve-version.outputs.version }}"
      ...
      - name: Build and push base image
        uses: docker/build-push-action@v7
        with:
          ...
          tags: |
            ghcr.io/${{ github.repository }}/${{ matrix.app }}:${{ steps.version.outputs.VERSION }}
            ghcr.io/${{ github.repository }}/${{ matrix.app }}:${{ needs.reserve-version.outputs.float_tag }}
```

### `publish-docker`

```yaml
  publish-docker:
    needs: [validate, reserve-version, publish-base-images]
    ...
      - name: Get unified version
        id: version
        run: |
          echo "VERSION=${{ needs.reserve-version.outputs.version }}" >> $GITHUB_OUTPUT
      ...
      - name: Build and push Docker image
        uses: docker/build-push-action@v7
        with:
          ...
          tags: |
            ghcr.io/${{ github.repository }}/${{ matrix.app }}:${{ steps.version.outputs.VERSION }}
            ghcr.io/${{ github.repository }}/${{ matrix.app }}:${{ needs.reserve-version.outputs.float_tag }}
```

### `verify-published-tags`

```yaml
  verify-published-tags:
    needs: [reserve-version, publish-base-images, publish-docker]
    ...
        env:
          VERSION: ${{ needs.reserve-version.outputs.version }}
          FLOAT_TAG: ${{ needs.reserve-version.outputs.float_tag }}
```

### `workflow-summary`

```yaml
  workflow-summary:
    needs: [reserve-version, verify-published-tags]
    ...
        run: |
          {
            echo "## Published Docker images"
            echo ""
            echo "**Image version (semver tag):** \`${{ needs.reserve-version.outputs.version }}\`"
            echo ""
            echo "Each image was also tagged **\`${{ needs.reserve-version.outputs.float_tag }}\`** (floating)."
            echo ""
            echo "Pin GitOps to the version tag or the floating tag. Git tag **\`${{ needs.reserve-version.outputs.version }}\`** is created during reserve-version on this run commit."
          } >> "$GITHUB_STEP_SUMMARY"
```

### `github-prerelease-create`

```yaml
  github-prerelease-create:
    needs: [reserve-version, git-tag-prerelease]   # git-tag-prerelease removed in 03
    ...
        env:
          IS_PROD: ${{ needs.reserve-version.outputs.is_prod }}
        with:
          script: |
            const version = "${{ needs.reserve-version.outputs.version }}";
            ...
```

### `changelog-pr-to-develop`

```yaml
  changelog-pr-to-develop:
    needs: [github-prerelease-create, reserve-version, git-tag-prerelease]
    ...
        env:
          PUBLISH_VERSION: ${{ needs.reserve-version.outputs.version }}
          ...
      - name: Open pull request
        uses: peter-evans/create-pull-request@v6
        with:
          # token: + persist-credentials: false will be added in 04-changelog-auth-fix.md
          commit-message: "chore: archive changelog for ${{ github.ref_name }} ${{ needs.reserve-version.outputs.version }}"
          title: "chore: archive changelog for ${{ needs.reserve-version.outputs.version }} (${{ github.ref_name }})"
          ...
          branch: automation/changelog-${{ github.ref_name }}-${{ needs.reserve-version.outputs.version }}-${{ github.run_id }}
```

## Note on `git-tag-prerelease`

Like metaboost, `git-tag-prerelease` is left in place during this phase as a
defensive backstop. Because `reserve-version` already created the tag at
`github.sha`, `git-tag-prerelease` will hit its `noop` branch and Phase 1 is safe
to ship without Phase 2.

## Key files

- [.github/workflows/publish-alpha.yml](../../../../.github/workflows/publish-alpha.yml)

## Verification (this step)

After Phase 1 ships, push to `alpha`. Expect:

- `reserve-version` log: `Reserved version: 0.X.Y-alpha.N`.
- `git-tag-prerelease` log: `Tag 0.X.Y-alpha.N already points at <sha>; noop.`
- All other jobs see the same version string.
