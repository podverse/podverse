### Session 1 - 2026-02-04

#### Prompt (Developer)

implement the plan

#### Key Decisions

- Use a workspace package import to avoid Lighthouse rootDir bleed.
- Keep usage scoped to tools by only updating Lighthouse and docs.

#### Files Modified

- .llm/history/active/test-assets-rootdir-fix/test-assets-rootdir-fix-part-01.md
- tools/test-assets/package.json
- tools/test-assets/tsconfig.json
- tools/web-perf/lighthouse/src/index.ts
- tools/web-perf/lighthouse/TOOLS-WEB-PERF-LIGHTHOUSE.md
