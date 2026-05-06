# modal-overlay-separation

## Metadata

- **Started:** 2026-05-05
- **Author:** Agent
- **Context:** Podverse web modal panel clarity over dimmed backdrop

---

### Session 1 - 2026-05-05

#### Prompt (Developer)

this modal overlay design needs an outline or shadow or something so the form doesn't completely blend in with the background.

#### Key Decisions

- Introduced canonical `--shadow-modal` in `packages/ui` (`_variables-root.scss`): hairline using `var(--border-color-opaque)` plus a stronger drop shadow so the panel separates from `rgba(0,0,0,0.7)` backdrop in light and dark themes.
- Applied `box-shadow: var(--shadow-modal)` on `apps/web` `.modalContent` only (management-web does not use this Modal module).

#### Files Created/Modified

- `packages/ui/src/styles/_variables-root.scss`
- `apps/web/src/styles/components/Modal/Modal.module.scss`
- `.llm/history/active/modal-overlay-separation/modal-overlay-separation-part-01.md`
