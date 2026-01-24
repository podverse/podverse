---
name: podverse-global-patterns
version: 1.0.0
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

**300 line limit.** Split large plans:
```
feature/
├── index.md
├── 01a-part1.md
└── 01b-part2.md
```

Plans organized by status:
```
.cursor/plans/
├── active/
│   └── feature-xyz/
├── completed/
│   └── feature-abc/
└── README.md
```

## Plan Completion

After verifying a plan is complete, ask:
> "Would you like me to mark this plan as completed?"

If yes, move the plan directory from `active/` to `completed/`.

## LLM History

**If modifying files, log prompt FIRST** to `.llm/history/active/[feature].md`
Then at end: Add files changed and key decisions.
Skip for pure Q&A.
