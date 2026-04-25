# Likes experience refresh — summary

**Location:** [./](./) (this directory under `.llm/plans/active/`)  
**Product context:** [00-master.md](./00-master.md) — the external Cursor file `likes_ux_refresh_plans_78b64a83.plan.md` is **optional** extra context; **00-master** is the canonical in-repo spec.  
**Supersedes / links:** [00-master.md](./00-master.md) “Supersedes” section; foundation from completed `web-like-button-clean-break`.

**Orchestration:** [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) · [COPY-PASTA.md](./COPY-PASTA.md)

## Intent (one paragraph)

Refresh likes UX: More menu + batch membership (core and Add-by-RSS), private playlist ordering, optional lightweight likes `GET`, My Playlists behavior, full + mini **media player** rules (VTS remote, chapters, `toc: false`, VTS heart, logged-out like affordance), playlist edit rules (no `medium` change on update), tests and verification.

## Scope by phase (pointers)

| File | Area |
|------|------|
| [01](./01-api-and-helpers-likes-summary.md) | ORM list order, `include_resources`, **no `medium` on PATCH** |
| [02](./02-web-more-menus-and-membership.md) | Batching hooks, **surface checklist**, Option A/B, i18n |
| [03](./03-web-playlists-my-playlists-pinned.md) | Single fetch / server order |
| [04](./04-web-full-player-vts-heart.md) | Full + **Desktop/Mobile** info, **data contract** table, VTS heart |
| [05](./05-web-playlist-edit-constraints.md) | Read-only medium on edit, aligned API |
| [06](./06-tests-e2e-and-verification.md) | **Minimum** vs **stretch** tests |
| [07](./07-e2e-media-player-test-foundation.md) | Deterministic media-player E2E foundations (assets, seed, helpers) |
| [08](./08-e2e-likes-and-player-overlay-matrix.md) | Final likes/auth + overlay hierarchy E2E matrix and screenshots |

## Tightening applied (this revision)

- **01 / 05** rewritten for **no `medium` on any** playlist `PATCH` / user update.  
- **02** has **concrete hook names**, **8-row surface checklist**, and **Option A vs B** for login.  
- **04** names **MediaPlayerInfoDesktop** / **Mobile** + a **data contract** table.  
- **06** has explicit **minimum** and **stretch**; waiver rules.  
- **07/08** added for the complex E2E work: deterministic local media setup, scenario spoofing, reusable player helpers, and screenshot-proof matrix specs.  
- **External plan file** is optional, not a blocker.

## Residual risk (intentional)

- **04** still depends on DTO/API for VTS + chapters; stub is OK until a PR fills the contract.  
- **E2E** may stay minimal at 06 gate; final behavior-proof coverage now lives in 07/08.
- **Cross-client contract drift:** this plan set targets web + api/helpers paths in this directory. If management-web/management-api or native clients rely on playlist update payloads, handle in a follow-up plan or document explicit non-impact.

## Definition of done

See each `0X-` file and its checkboxes, plus [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md).

## Verification (monorepo)

From **repo root**; `./scripts/nix/with-env` for `node`/`npm` per [AGENTS.md](../../../../AGENTS.md). Postgres and Valkey for many integration tests — see AGENTS and `make test_deps`.

## Related skills

- [parallel-plan-execution](../../../../.cursor/skills/parallel-plan-execution/SKILL.md)  
- [plan-completion](../../../../.cursor/skills/plan-completion/SKILL.md)
