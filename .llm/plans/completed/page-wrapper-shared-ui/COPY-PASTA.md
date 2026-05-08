# PageWrapper → shared UI — copy-pasta checklist

- [x] `01-move-pagewrapper-to-shared-ui.md`

Paste the phase **Prompt** block into a session when executing manually. This single-phase set is
**complete**; `COPY-PASTA.md`, `00-EXECUTION-ORDER.md`, `00-SUMMARY.md`, and `01-*.md` live under
`.llm/plans/completed/page-wrapper-shared-ui/`.

## Prompt blocks (verbatim)

### 01

Execute **PageWrapper → `@podverse/ui` — phase 01** per
[`01-move-pagewrapper-to-shared-ui.md`](./01-move-pagewrapper-to-shared-ui.md): implement the shared
`PageWrapper`, export it, update `apps/web` root layout, delete the app-local component and SCSS, and
append LLM history. Preserve `id="page-wrapper"` and verify build; suggest targeted E2E smoke per
repo rules.
