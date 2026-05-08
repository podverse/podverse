# 04 — Promote textarea, search, and checkbox groups

## Prompt (Agent)

Execute **phase 04**: promote the rich textarea (distinct export name from primitive `TextArea`),
SearchInput, and TextCheckboxes; reconcile overlap with `CheckboxFieldList` / `CheckboxField` without
breaking management-web consumers of primitives.

## Rich textarea export

- **Do not** replace [`packages/ui` primitive `TextArea`](../../../../packages/ui/src/components/form/fieldPrimitives/TextArea.tsx).
- Add **`FormTextArea`** (final name per phase 01) implementing web’s eyebrow, info row, optional
  loading overlay, `footerLeftContent`, character counter — all label/copy props passed from apps.

## SearchInput

- Move search-specific chrome and SCSS; ensure transcript + search header flows keep behavior.

## TextCheckboxes

- Multi-value selection array API (`selectedValues: string[]`).
- Optional eyebrow row — localized string from app.
- Decide whether to compose **`CheckboxField`** rows internally or keep bespoke markup with shared
  tokens only; goal is **one** checkbox-group UX aligned with web.

## Consumers to verify after migration

- `ModalDisclaimer.tsx` (TextCheckboxes)
- Playlist / Settings / Boost forms importing composite TextArea or SearchInput paths from web

## Management-web

No requirement to adopt `FormTextArea` in phase 04 unless a call site already duplicates behavior —
phase 06 handles deliberate convergence.
