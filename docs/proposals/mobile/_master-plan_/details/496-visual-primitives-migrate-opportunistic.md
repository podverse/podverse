# 496-visual-primitives-migrate-opportunistic

**Master step:** 9b.7
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- Opportunistically migrate Home feed rows, Search rows, and Library list rows to `ListRow` /
  `Card` / `Button` while touching those screens for PG-7 / data-layer work.
- Do **not** require a full visual polish pass — that remains a later phase.

## Acceptance criteria

- At least Home + Search + one Library screen use shared primitives for primary lists
- Layout IA still matches web; intentional divergences noted if any
- Existing Maestro flows for home/search/library still pass

## Web parity references

- [DOCS-MOBILE-PROCESS-VISUAL-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-VISUAL-PARITY.md)
- **mobile-theme-parity** § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- home
npm run mobile:e2e:test -- search
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
