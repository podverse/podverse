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

Plans organized by project:
```
.cursor/plans/
├── monorepo-migration/
├── feature-xyz/
└── README.md
```
