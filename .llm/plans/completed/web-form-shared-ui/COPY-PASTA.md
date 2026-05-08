# Web Form → shared UI — copy-pasta checklist

- [x] `01-inventory-naming-and-collisions.md`
- [x] `02-promote-simple-form-controls.md`
- [x] `03-promote-text-input-family.md`
- [x] `04-promote-textarea-search-and-checkbox-groups.md`
- [x] `05-apps-web-migration-and-cleanup.md`
- [x] `06-management-web-convergence.md`
- [x] `07-verification-and-rollout.md`

Paste each phase’s **Prompt** block into a session when executing manually. Update checkboxes as phases
complete; move completed numbered files to `.llm/plans/completed/web-form-shared-ui/` when the set is
done (keep `COPY-PASTA.md` and `00-*` in `active/` until then).

## Prompt blocks (verbatim)

### 01

Execute **Web Form → shared UI — phase 01**: inventory every import of
`apps/web/src/components/Form/*`, document collisions with existing `@podverse/ui` exports (`Input`,
`TextArea`, `Checkbox`, `CheckboxField`), and lock export names for promoted components (especially
the rich textarea vs primitive `TextArea`). Deliver a short matrix in the phase file appendix; no
product behavior change unless documenting.

### 02

Execute **phase 02**: promote Checkbox (labeled), RadioButton, SwitchButton, and InlineForm into
`packages/ui/src/components/form/` (or adjacent folders per convention), port web SCSS as the visual
source of truth, export from `packages/ui/src/index.ts`, and update **only** call sites needed for
compilation in this slice if doing incremental migration; otherwise prepare exports for phase 05.

### 03

Execute **phase 03**: promote TextInput, TextInputNumber, TextInputNumberIncrements, and
TextInputHHMMSS into `packages/ui`; keep props copy-free; preserve web layout and interaction;
add Vitest coverage for non-trivial behavior (e.g. increment bounds, time parsing) where risk warrants.

### 04

Execute **phase 04**: promote the rich textarea (distinct export name from primitive `TextArea`),
SearchInput, and TextCheckboxes; reconcile overlap with `CheckboxFieldList` / `CheckboxField` without
breaking management-web consumers of primitives.

### 05

Execute **phase 05**: migrate **all** `apps/web` imports from local `components/Form/` to
`@podverse/ui`; remove `apps/web/src/components/Form/` and unused `apps/web/src/styles/components/Form/`
modules; ensure `apps/web/AGENTS.md` guidance remains satisfied (no pointless local re-export
wrappers).

### 06

Execute **phase 06**: update `apps/management-web` so equivalent UX uses the **same** shared
components as web (e.g. labeled text fields → shared rich `TextInput` where appropriate); retain
`Input`/`Label` only when the simple primitive is intentionally correct; web styling already baked into
shared SCSS from earlier phases.

### 07

Execute **phase 07**: run lint/build checks, add or update Playwright coverage for touched flows per
`feature-implementation-testing`, document verification commands per `response-ending-make-verify`,
update `.llm/history/active/`, and move this plan set to `completed/` when done.
