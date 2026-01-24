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

## LLM History

**If modifying files, log prompt FIRST** to `.llm/history/active/[feature].md`
Then at end: Add files changed and key decisions.
Skip for pure Q&A.

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
✅ History updated: .llm/history/active/[feature].md
```
