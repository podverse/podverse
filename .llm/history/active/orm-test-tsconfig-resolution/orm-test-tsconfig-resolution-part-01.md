# orm-test-tsconfig-resolution

**Started:** 2026-04-30

### Session 1 - 2026-04-30

#### Prompt (Developer)

For the code present, we get this error:

```
Cannot find module '@orm/entities/feed/feed.js' or its corresponding type declarations.
```

Fix it, verify, and then give a concise explanation. @podverse/packages/orm/src/services/feed/feed.test.ts:1-3

#### Key Decisions

- Root `packages/orm/tsconfig.json` excludes `**/*.test.ts`, so `@orm/*` path mappings did not apply to test files in the IDE/`tsc`.
- Added `tsconfig.test.json` extending the package config with `include` only for `*.test.ts` and `noEmit: true`; wired `type-check` to run both projects.
- Fixed strict typing surfaced once tests were type-checked (`applyProperties` mock, `Feed` casts, enum assertion IDs, `feedFlagStatus.test.ts` `_entity.name` on `unknown`).

#### Files Created/Modified

- packages/orm/tsconfig.test.json (new)
- packages/orm/package.json (`type-check` script)
- packages/orm/src/services/feed/feed.test.ts
- packages/orm/src/services/feed/feedFlagStatus.test.ts
