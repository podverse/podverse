# Feature: image-shrinking-service (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `image-shrinking-service-part-02.md`.

## Metadata

- Started: 2026-02-15
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/45
- Branch: feature/image-shrinking-service
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[What problem does this solve? What's the goal?]

## Sessions

### Session 1 - 2026-02-15

#### Prompt (Developer)

save the plan files locally according to our standard practices

#### Key Decisions

- Stored the plan split across three files under
  `.llm/plans/active/image-shrinking-service/` to match repo conventions.
- Named the files `00-architecture.md`, `01-do-package.md`, and
  `02-worker-and-db.md` to reflect execution order.

#### Files Modified

- .llm/plans/active/image-shrinking-service/00-architecture.md
- .llm/plans/active/image-shrinking-service/01-do-package.md
- .llm/plans/active/image-shrinking-service/02-worker-and-db.md

### Session 2 - 2026-02-15

#### Prompt (Developer)

add and update the plan files

#### Key Decisions

- Added a master plan index to describe the end-to-end flow and doc deliverable.
- Expanded plan steps to include DO setup, env vars, and web list-only usage rules.
- Set the resized width to a single env var `IMAGE_SHRINK_WIDTH_PX`.

#### Files Modified

- .llm/plans/active/image-shrinking-service/00-master-plan.md
- .llm/plans/active/image-shrinking-service/00-architecture.md
- .llm/plans/active/image-shrinking-service/01-do-package.md
- .llm/plans/active/image-shrinking-service/02-worker-and-db.md

### Session 3 - 2026-02-15

#### Prompt (Developer)

update the plans so they are closer to implementation ready

#### Key Decisions

- Added deterministic CDN key strategy and a backfill job step.
- Specified concrete web list components to update and helper changes in
  `packages/helpers/src/lib/image.ts`.
- Added env template/infra update steps and clarified the single-size strategy.

#### Files Modified

- .llm/plans/active/image-shrinking-service/00-master-plan.md
- .llm/plans/active/image-shrinking-service/00-architecture.md
- .llm/plans/active/image-shrinking-service/01-do-package.md
- .llm/plans/active/image-shrinking-service/02-worker-and-db.md

### Session 4 - 2026-02-15

#### Prompt (Developer)

update the plans with the tightenings

#### Key Decisions

- Clarified API unchanged and web helper-only list selection.
- Added k8s/ArgoCD/env template targets and rollout gates.
- Added idempotency and backfill controls for the resize worker.

#### Files Modified

- .llm/plans/active/image-shrinking-service/00-master-plan.md
- .llm/plans/active/image-shrinking-service/00-architecture.md
- .llm/plans/active/image-shrinking-service/01-do-package.md
- .llm/plans/active/image-shrinking-service/02-worker-and-db.md

### Session 5 - 2026-02-15

#### Prompt (Developer)

tighten

#### Key Decisions

- Added concrete k8s/ArgoCD file targets for workers env wiring.
- Defined list image helper signatures and list-only usage contract.
- Added explicit backfill defaults for batch size, concurrency, and rate limits.

#### Files Modified

- .llm/plans/active/image-shrinking-service/00-master-plan.md
- .llm/plans/active/image-shrinking-service/01-do-package.md
- .llm/plans/active/image-shrinking-service/02-worker-and-db.md

### Session 6 - 2026-02-15

#### Prompt (Developer)

update the plans

#### Key Decisions

- Added explicit list-helper precedence rules for resized image selection.
- Added env overrides for backfill tuning and called out secrets usage in k8s.
- Added backfill tuning env vars to the required env list.

#### Files Modified

- .llm/plans/active/image-shrinking-service/00-master-plan.md
- .llm/plans/active/image-shrinking-service/01-do-package.md
- .llm/plans/active/image-shrinking-service/02-worker-and-db.md

### Session 7 - 2026-02-15

#### Prompt (Developer)

K8s secret creation workflow still implicit
Helper precedence rules are solid but could note exact comparison behavior:
improve these as well in the plan files

#### Key Decisions

- Added explicit k8s secret creation workflow and script naming guidance.
- Documented list-helper comparison behavior in terms of existing helper logic.

#### Files Modified

- .llm/plans/active/image-shrinking-service/01-do-package.md
- .llm/plans/active/image-shrinking-service/02-worker-and-db.md

### Session 8 - 2026-02-15

#### Prompt (Developer)

update plans with your recommendations

#### Key Decisions

- Clarified secret script naming to match `create_*_secret.sh` convention.
- Added backfill env vars to the deployment documentation checklist.

#### Files Modified

- .llm/plans/active/image-shrinking-service/00-master-plan.md
- .llm/plans/active/image-shrinking-service/01-do-package.md

### Session 9 - 2026-02-15

#### Prompt (Developer)

i'm confused by the existence of IMAGE_SHRINK_WIDTH_PX and the backfill. don't we just need one, or the other? can we just use the backfill? and if that's the case, maybe the env var doesn't need to be called "backfill" if backfilling it's the only way we populate the shrunken images

#### Key Decisions

- Shifted to batch-only resizing (no continuous parser-triggered jobs).
- Renamed backfill env vars to general image-shrink batch controls.

#### Files Modified

- .llm/plans/active/image-shrinking-service/00-master-plan.md
- .llm/plans/active/image-shrinking-service/00-architecture.md
- .llm/plans/active/image-shrinking-service/01-do-package.md
- .llm/plans/active/image-shrinking-service/02-worker-and-db.md

### Session 10 - 2026-02-15

#### Prompt (Developer)

scheduled cron

however, i think that the parser should send data to the mq during the parsing so the backfill process knows which images are likely to need an update sooner?

#### Key Decisions

- Added hourly cron schedule for batch resizing.
- Added parser MQ hints to prioritize batch processing.

#### Files Modified

- .llm/plans/active/image-shrinking-service/00-master-plan.md
- .llm/plans/active/image-shrinking-service/00-architecture.md
- .llm/plans/active/image-shrinking-service/01-do-package.md
- .llm/plans/active/image-shrinking-service/02-worker-and-db.md

---

## Related Resources

- [Link to PR]
- [Link to related issues]
