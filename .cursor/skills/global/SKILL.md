---
name: podverse-global-patterns
version: 1.1.0
---

# Global Patterns

## Dependencies

Tier 1 → Tier 2 → ... → Tier 5. Only depend on lower tiers.

## Workspace Deps

```json
{ "dependencies": { "@podverse/helpers": "workspace:*" } }
```

## TypeScript Config

```json
{ "extends": "../../tsconfig.base.json" }
```

## Package Structure

```
packages/name/
├── src/index.ts
├── package.json
└── tsconfig.json
```

## Plan Management

**Critical**: Plans go in `.llm/plans/` directory, **NOT** `.cursor/plans/`.

The `.cursor/` directory is for IDE-specific config only (rules, skills, settings).

**300 line limit.** Split large plans:

```
feature/
├── 00-master-plan.md     # Index: master plan overview
├── 01-part1.md           # Sequential implementation plans
└── 02-part2.md
```

**Plan index files**: Use `00-master-plan.md` (primary) or `00-overview.md` (alternative).
Never use `README.md` or full-path names.

Plans organized by status:

```
.llm/plans/
├── active/
│   └── feature-xyz/
├── completed/
│   └── feature-abc/
└── README.md
```

## Plan Completion

After verifying a plan is complete, ask:

> "Would you like me to mark this plan as completed?"

If yes, move the plan from `active/` to `completed/`.

### Grouping Sub-Plans

When a phase has multiple sub-plans (e.g., 04a, 04b, 04c...), group them in a subdirectory:

```
completed/
└── monorepo-migration/
    ├── 01-infrastructure/      # Group of 01a, 01b, 01c...
    │   ├── 01a-configs.md
    │   ├── 01b-git-hooks.md
    │   └── index.md            # Parent outline
    ├── 03-apps/                # Group of 03a, 03b...
    └── 04-infra-tooling/       # Group of 04a, 04b...
```

**Pattern**: `NN-descriptive-name/` containing `NNx-*.md` files.

## Complexity Assessment

**BEFORE executing any plan**, assess complexity. If ANY threshold exceeded, STOP and recommend breaking down the work.

### Thresholds (trigger if ANY exceeded)

- **3+ packages/modules** being modified
- **10+ files** expected to change
- **2+ dependency chains** (A→B→C where each depends on prior)
- **20+ minutes** estimated execution time

### Required Behavior When Exceeded

1. **STOP** - Do not begin execution
2. **List** the complexity factors detected
3. **Propose** natural breakpoints (e.g., one package at a time)
4. **Ask** developer to confirm smaller scope
5. **Only proceed** after explicit approval of reduced scope

### Example Response

```
⚠️ This plan exceeds complexity thresholds:
- 6 packages to modify (threshold: 3)
- Chained dependencies: helpers → external-services → orm → ...

Recommended breakdown:
1. helpers (standalone)
2. external-services (depends on helpers)
3. orm (depends on helpers)
...

Shall I proceed with just "helpers" first?
```

## Code Quality

**Treat warnings as errors.** Fix all lint warnings before considering a task complete:

- Non-null assertions (`!`) → Use `??` with defaults or proper null checks
- Console statements → Use `console.warn`/`console.error`, or add file-level `/* eslint-disable no-console */` with justification comment
- Unused variables → Prefix with `_` or remove
- Missing return types → Add explicit types

Only use eslint-disable when:

1. There's a documented reason (comment explaining why)
2. The pattern is intentional (e.g., startup logging module)

## LLM History

**Capture prompts when:**

1. About to modify files (existing rule)
2. Entering planning mode for a tracked feature
3. User explicitly requests plan creation

Log the prompt at the START of your response, before any tool calls.
Then at end: Add files changed and key decisions.
Skip for pure Q&A conversations.

### History Rule Limitations

The auto-reminder rule (`.cursor/rules/llm-history-tracking.mdc`) is **glob-based**.
It may NOT trigger when working on:

- Documentation files (`docs/*.md`)
- Root config files (`.cursorrules`, etc.)
- Files in directories not in the glob list

**Always check**: Did I update the history? If unsure, update it.

### End of Response Confirmation

After any substantive work, confirm:

```
✅ History updated: .llm/history/active/[feature]/[feature].md
```

Or for multi-part features:

```
✅ History updated: .llm/history/active/[feature]/[feature]-part-NN.md
```

## Related Skills

- **[Web Patterns](../web/SKILL.md)** - Next.js app patterns (`apps/web/`)
- **[API Patterns](../api/SKILL.md)** - Express API patterns (`apps/api/`)
- **[ORM Patterns](../orm/SKILL.md)** - Database patterns (`packages/orm/`)
