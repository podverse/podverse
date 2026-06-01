---
name: podverse-global-patterns
version: 1.1.0
---

# Global Patterns

## Dependencies

Tier 1 → Tier 2 → ... → Tier 5. Only depend on lower tiers.

## Workspace Deps

```json
{
  "dependencies": {
    "@podverse/helpers": "workspace:*",
    "@podverse/helpers-validation": "workspace:*",
    "@podverse/helpers-requests": "workspace:*"
  }
}
```

**Helper packages available:**

- `@podverse/helpers` - Core utilities, types, DTOs
- `@podverse/helpers-validation` - Validation utilities
- `@podverse/helpers-requests` - API request utilities
- `@podverse/helpers-backend` - Backend utilities
- `@podverse/helpers-browser` - Browser utilities
- `@podverse/helpers-config` - Config validation

## TypeScript Config

```json
{ "extends": "../../tsconfig.base.json" }
```

### App internal import aliases

Node apps (`apps/api`, `apps/management-api`, `apps/workers`) import from their own `src/` via a path alias whose prefix **matches the full `apps/<name>/` directory** (e.g. `@management-api/*`, not `@mgmt-api/*`). Workspace packages stay `@podverse/*`. Rule: `.cursor/rules/app-internal-import-aliases.mdc`.

Avoid type assertions (`as`) when a better approach exists (types, narrowing, type guards).

Prefer **named exports** in TypeScript modules; avoid `export default` when a named export works. See [prefer-named-exports](./prefer-named-exports/SKILL.md) (Next.js `page` defaults excepted).

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

When you finish executing a plan in `active/`, **automatically** move it to `completed/` (do not
ask). If it's the last plan in its set (execution order, copy-pasta, or feature directory), move
the whole set. See **[Plan Completion](/.cursor/skills/plan-completion/SKILL.md)** for full behavior.

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

## Commands From Monorepo Root

When giving terminal or npm commands, **always give them relative to the monorepo root**. Do not instruct "cd apps/workers" (or similar) first. Use `npm run <script> -w apps/<workspace> -- [args]` so the user can copy-paste from repo root. **Always put runnable commands in a fenced code block** (e.g. `bash ... `) so the IDE shows a copy button; never give only inline commands when the user may want to run them. See `.cursor/rules/commands-from-monorepo-root.mdc`.

## GitHub Workflows

**Issue Templates & Labels**: [docs/repo-management/GITHUB-LABELS.md](/docs/repo-management/GITHUB-LABELS.md)

The repository uses 23 carefully curated labels and 5 issue templates. When creating issues or discussing GitHub workflows, refer to the label documentation.

**Available issue templates**:

- Bug Report → `bug` label
- Feature Request → `enhancement` label
- Technical Improvement → `technical-improvement` label
- Infrastructure → `infra` label
- Documentation → `docs` label

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

## Module format and imports

- **ESM formatting**: Use ESM-style imports and `.js` extensions in relative paths. Packages and apps use NodeNext (ESM).
- **import type**: Use `import type` whenever the import is used only as a type (e.g. type annotations, generics). Use value imports when the symbol is used at runtime (e.g. classes for `instanceof`, decorators that need the constructor).
- **Import order**: Node built-ins → external packages → workspace (`@podverse/*`) → relative → styles last. Enforced by ESLint; fix with `npm run lint:fix`.

## Code Quality

- **Component props:** Do not pass `undefined` explicitly to components. Allow `null` as a value for optional props so callers can pass `prop={value}` directly; components treat `null` (and `undefined`) as "not set" / default behavior. When checking optional string props (e.g. error messages) for "has value", use a simple falsy check (`Boolean(value)` or `if (value)`) instead of explicit `!== undefined && !== null && !== ''`.

**Treat warnings as errors.** Fix all lint warnings before considering a task complete:

- Non-null assertions (`!`) → Use `??` with defaults or proper null checks
- Console statements → Use `console.warn`/`console.error`, or add file-level `/* eslint-disable no-console */` with justification comment
- Unused variables → Prefix with `_` or remove
- Missing return types → Add explicit types

Only use eslint-disable when:

1. There's a documented reason (comment explaining why)
2. The pattern is intentional (e.g., startup logging module)

## Related Skills

- **[Plan Completion](/.cursor/skills/plan-completion/SKILL.md)** - Auto-archive completed plans (and full set when last)
- **[GitHub Workflows](/.cursor/skills/github/SKILL.md)** - PR/issue management and GitHub CLI usage
- **[Web Patterns](/.cursor/skills/web/SKILL.md)** - Next.js app patterns (`apps/web/`)
- **[Bundle Optimization](/.cursor/skills/bundle-optimization/SKILL.md)** - Bundle size awareness when adding deps, changing helpers, or heavy UI
- **[Header / hero image sources](/.cursor/skills/header-hero-image-sources/SKILL.md)** - List vs header artwork: `*LoadCandidates` / `*HeroLoadCandidates` and `greater` + `IMAGES.HEADER.*` for heroes
- **[API Patterns](/.cursor/skills/api/SKILL.md)** - Express API patterns (`apps/api/`)
- **[Management API Patterns](/.cursor/skills/management-api/SKILL.md)** - Management API Express patterns
- **[ORM Patterns](/.cursor/skills/orm/SKILL.md)** - Database patterns (`packages/orm/`)
