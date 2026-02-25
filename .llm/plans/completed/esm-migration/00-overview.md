# ESM Migration Subplans (Overview)

Issue: podverse#52

## Goal
Migrate all packages and apps in the Podverse monorepo to native ESM, while preserving runtime
behavior (especially workers command validation), maintaining build pipelines, and avoiding
breaking changes to workspace imports.

## Scope

- Packages: `packages/*`
- Apps: `apps/*`
- Tools and scripts: `tools/*`, `scripts/*`
- Root and shared configuration

## Non-Goals

- New features beyond ESM migration
- Re-architecture or dependency upgrades unless required for ESM compatibility

## Subplan Files (Execution Order)

1. `10-config-and-build.md` — root and shared config, TS build output decisions
2. `20-packages.md` — workspace packages migration and exports map work
3. `30-apps-web.md` — web and management-web ESM alignment
4. `40-apps-api.md` — api and management-api runtime changes
5. `50-apps-workers.md` — workers boot ordering, dynamic import strategy
6. `60-scripts-and-tools.md` — scripts, configs, CLI entrypoints
7. `70-interop-and-verification.md` — interop rules, tests, rollout

## Key Constraints and Risks

- Workers must preserve validation-before-config behavior currently enforced via ordered
  `require()`.
- Any ESM conversion must respect Node 24 runtime and TypeScript strictness.
- Package entrypoints and exports must be consistent to prevent runtime resolution failures.

## Cross-References

- Root workspace config: [package.json](/Users/mitcheldowney/repos/pv/podverse/package.json)
- Base TS config: [tsconfig.base.json](/Users/mitcheldowney/repos/pv/podverse/tsconfig.base.json)
- Workers bootstrap ordering:
  [apps/workers/src/index.ts](/Users/mitcheldowney/repos/pv/podverse/apps/workers/src/index.ts)
