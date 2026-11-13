# 01 — Legacy Repos and Reference Setup

## Goal

Know where the v4 (OGen / Legacy) source and infra live on disk, how agents should
read them, and how the prod-copy test database is referenced without putting its
URL in the repo.

## Status

Draft. Needs operator review.

## What we know

### Layout on this machine

The NextGen monorepo is `/Users/mitcheldowney/repos/pv/podverse`. The v4 and
pre-monorepo repos sit one level up in `/Users/mitcheldowney/repos/`.

Most of those checkouts are currently on **`v5-develop`**. That branch is the
split-repo v5 era **before** the monorepo. It is **not** production v4. Reading
the working tree without checking the branch will give the wrong code.

### v4-relevant repos and branches

| Checkout path                 | Use for v4                             | Branch to read        |
| ----------------------------- | -------------------------------------- | --------------------- |
| `~/repos/podverse-api`        | API, entities, parser/queue scripts    | `develop` / `master`  |
| `~/repos/podverse-web`        | Consumer web                           | `develop` / `master`  |
| `~/repos/podverse-rn`         | Mobile (also `~/repos/pv/podverse-rn`) | `develop`             |
| `~/repos/podverse-fdroid`     | F-Droid flavor                         | `develop`             |
| `~/repos/podverse-shared`     | Shared types                           | `develop` / `v4.16.x` |
| `~/repos/podverse-ops`        | Prod docker compose and env layout     | `master`              |
| `~/repos/pv/podverse-ansible` | Prod/sandbox/alpha Ansible             | `master`              |

In v4, `podverse-api` `scripts:*` jobs are the workers. The separate
`podverse-workers` checkout looks like a 2023 stub and is not the production
worker surface.

These are **not** v4 (they are split-era v5): `podverse-orm`, `podverse-parser`,
`podverse-mq`, `podverse-helpers`, `podverse-management-*`, `podverse-qa`,
`podverse-admin`, `podverse-external-services`, `podverse-notifications`.

No new clones appear necessary. Prefer **not** adding the v4 repos to the Cursor
workspace. Use sibling worktrees or `git show <branch>:<path>` instead.

### Prod-copy test database

A copy of the production v4 database already runs on a test server for migration
rehearsal. It is a snapshot from a point in time, not live production. Its host
URL must **never** be committed. Operators and agents refer to it only as
`V4_DATABASE_URL`.

The value lives in one home file, outside this repo:

`~/.config/podverse/v4-database-url`

The file is `KEY=value` with `#` comments. Replace every `REPLACE_WITH_*` token
before rehearsal. A file that still contains `REPLACE_WITH_` is unset. Do not
look for another URL. Load it only into the process that runs `psql`. See
[06](06-database-migration-rehearsal.md).

Reports from rehearsal runs must not contain emails or raw row dumps.

### Infra split

| Era | How prod is deployed                                      |
| --- | --------------------------------------------------------- |
| v4  | `podverse-ansible` + `podverse-ops` docker compose on VMs |
| v5  | Monorepo + k8s (alpha today; beta and prod later)         |

## Proposed approach

1. Create read-only worktrees under `~/repos/pv/v4/` for the branches above so
   agents can open files without flipping the existing checkouts off
   `v5-develop`.
2. Keep `V4_DATABASE_URL` out of the monorepo. Document only the env var name.
3. Treat `podverse-api@develop` as the schema source of truth for migration
   design, and `master` when confirming what is actually in production.

### Suggested worktrees (operator paste; fish-safe)

```bash
mkdir -p ~/repos/pv/v4
git -C ~/repos/podverse-api worktree add ~/repos/pv/v4/podverse-api develop
git -C ~/repos/podverse-web worktree add ~/repos/pv/v4/podverse-web develop
git -C ~/repos/podverse-shared worktree add ~/repos/pv/v4/podverse-shared develop
git -C ~/repos/podverse-ops worktree add ~/repos/pv/v4/podverse-ops master
```

`podverse-rn` and `podverse-fdroid` are already on `develop` (v4). The existing
`~/repos/pv/podverse-rn` checkout is enough; no second worktree is required unless
you want a dedicated path under `~/repos/pv/v4/`.

Without worktrees, agents can still read with:

```bash
git -C ~/repos/podverse-api show develop:src/entities/user.ts
```

## Honest limits and risks

- Working trees on `v5-develop` will keep confusing people. Extra worktrees
  wait until someone starts the migration code. The checkouts already under
  `~/repos/pv/v4/` stay as they are.
- Production v4 is believed to run `master`. The inventory was read from a
  local `develop` checkout. Local `master` and `develop` have the same files
  under `src/entities`, `src/migrations`, and `src/routes`. Confirm the
  running process before the identity seed.
- The prod-copy DB may lag production. Rehearsal timing is directional, not
  exact for launch day.

## Future plan sets

- Operator checklist to create and verify the worktrees.
- Agents read v4 checkouts under **v4-backend-reference**
  ([rule](/.cursor/rules/v4-backend-reference.mdc)).
