# COPY-PASTA — CI Atomic Version Reservation (podverse)

> **Archive (completed).** This whole plan set lives under
> `.llm/plans/completed/ci-atomic-version-reservation/`. The live publish workflows
> are `publish-staging.yml` / `publish-main.yml` (not `publish-alpha.yml`).
>
> **Historical gate (at planning time):** do not start until metaboost’s
> `atomic-publish-version-reservation` plan set was verified green on a real
> preprod run.
>
> References:
> - `metaboost/.llm/plans/completed/atomic-publish-version-reservation/`
> - `metaboost/.llm/plans/completed/atomic-publish-version-reservation/05-verification.md`
> - Successful run: `https://github.com/podverse/metaboost/actions/runs/24857171910`

Run prompts sequentially in this order.

---

## Prompt 1 — Add `reserve-version` job

Status: Completed (2026-04-23)

```
Implement plan file
.llm/plans/completed/ci-atomic-version-reservation/01-reserve-version-job.md
in the podverse repo. Add the `reserve-version` job to
.github/workflows/publish-alpha.yml between `validate` and `publish-base-images`
exactly as specified, using the podverse suffix mapping (alpha→alpha, beta→beta,
main→none). Do NOT delete the existing `Calculate unified version` step or the
`git-tag-prerelease` job in this commit; that happens in plan 03. Confirm the new
job exposes `version`, `float_tag`, `is_prod` outputs.
```

---

## Prompt 2 — Rewire downstream jobs to consume `reserve-version`

Status: Completed (2026-04-23)

```
Implement plan file
.llm/plans/completed/ci-atomic-version-reservation/02-rewire-needs-and-outputs.md
in the podverse repo. In .github/workflows/publish-alpha.yml, repoint
`publish-base-images`, `publish-docker`, `verify-published-tags`,
`workflow-summary`, `github-prerelease-create`, and `changelog-pr-to-develop` so
all `needs.validate.outputs.{version,float_tag,is_prod}` references become
`needs.reserve-version.outputs.*`, and add `reserve-version` to each `needs:` list.
Leave the `validate` outputs and `git-tag-prerelease` job in place for now
(cleaned up in plan 03).
```

---

## Prompt 3 — Remove `git-tag-prerelease` and the `validate` version-calc step

Status: Completed (2026-04-23)

```
Implement plan file
.llm/plans/completed/ci-atomic-version-reservation/03-remove-git-tag-prerelease-and-validate-version.md
in the podverse repo. In .github/workflows/publish-alpha.yml: delete the entire
`git-tag-prerelease` job; delete the `Calculate unified version` step from
`validate`; remove the `outputs:` block from `validate`; and update any `needs:`
lists that still reference `git-tag-prerelease`.
```

---

## Prompt 4 — Apply the `changelog-pr-to-develop` auth fix

Status: Completed (2026-04-23)

```
Implement plan file
.llm/plans/completed/ci-atomic-version-reservation/04-changelog-auth-fix.md
in the podverse repo. In .github/workflows/publish-alpha.yml's
`changelog-pr-to-develop` job: add `persist-credentials: false` to the
`Check out develop` step and pass `token: ${{ secrets.GITHUB_TOKEN }}` to the
`peter-evans/create-pull-request@v6` step. This matches the metaboost fix already
in place.
```

---

## Prompt 5 — Documentation note

Status: Completed (2026-04-23)

```
Implement plan file
.llm/plans/completed/ci-atomic-version-reservation/05-docs-note.md
in the podverse repo. Default to option A (header comment in
.github/workflows/publish-alpha.yml) unless the user has explicitly asked for a
new docs/PUBLISH.md.
```

---

## Prompt 6 — Verify the new pipeline on the preprod branch

Status: Completed (2026-04-23)

```
Walk through plan file
.llm/plans/completed/ci-atomic-version-reservation/06-verification.md
on the podverse repo. After triggering a preprod (staging) publish, post the
workflow run URL and confirm checklist items 1–9 are green.
```
