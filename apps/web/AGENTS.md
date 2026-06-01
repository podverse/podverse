# AI guide — `apps/web`

Monorepo-wide rules: [`AGENTS.md`](/AGENTS.md) (repository root).

- **Styles / design tokens:** [`styles-source-of-truth`](/.cursor/skills/styles-source-of-truth/SKILL.md) — canonical tokens live in `@podverse/ui`; this app may use one-line `@forward` shims under `src/styles/` to the package (do not duplicate values).
- **Media player (non-live):** [`media-player-architecture`](/.cursor/skills/media-player-architecture/SKILL.md) — bridge, controls context, `NonLiveMediaMount`, policy helpers; livestream stays on `video.js` until the HLS plan-set.
- **Shared UI components:** Prefer importing from `@podverse/ui` in feature files. When the **same** configured usage (including `next-intl` for `aria-label` / copy) appears **twice or more**, extract a thin app-local wrapper under `src/components/` that forwards props — see **`reusable-components`** (app-local configured wrappers). Avoid bare `export { X } from '@podverse/ui'` re-exports with no wiring.
- **Modals:** [`modal-layout-contract`](/.cursor/skills/modal-layout-contract/SKILL.md) — use **`Modal.Actions`** for modal footers (right-aligned, wrap); do not mask horizontal overflow with **`overflow-x: hidden`**.
