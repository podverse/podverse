# Execution order

Run the numbered prompts in order:

1. `01-packages-ui-footer-brand-and-copyright.md`
2. `02-apps-web-wire-i18n-and-cleanup.md`
3. `03-verification.md`

## Dependencies

- `02` depends on `01` (exports and components must exist).
- `03` runs after `01` and `02`.

## Completion tracking

Use [COPY-PASTA.md](./COPY-PASTA.md). This set now lives under
`.llm/plans/completed/footer-shared-ui/` (see [plan-completion](../../../../.cursor/skills/plan-completion/SKILL.md)).
