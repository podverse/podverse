# AI guide — `apps/web`

Monorepo-wide rules: [`AGENTS.md`](/AGENTS.md) (repository root).

- **Styles / design tokens:** [`styles-source-of-truth`](/.cursor/skills/styles-source-of-truth/SKILL.md) — canonical tokens live in `@podverse/ui`; this app may use one-line `@forward` shims under `src/styles/` to the package (do not duplicate values).
- **Media player (non-live):** [`media-player-architecture`](/.cursor/skills/media-player-architecture/SKILL.md) — bridge, controls context, `NonLiveMediaMount`, policy helpers; livestream playback renders the same `MediaElement` (native element, lazy `hls.js` for HLS) with no player library.
- **Shared UI components:** Prefer importing from `@podverse/ui` in feature files. When the **same** configured usage (including `next-intl` for `aria-label` / copy) appears **twice or more**, extract a thin app-local wrapper under `src/components/` that forwards props — see **`reusable-components`** (app-local configured wrappers). Avoid bare `export { X } from '@podverse/ui'` re-exports with no wiring.
- **Modals:** [`modal-layout-contract`](/.cursor/skills/modal-layout-contract/SKILL.md) — use **`Modal.Actions`** for modal footers (right-aligned, wrap); do not mask horizontal overflow with **`overflow-x: hidden`**.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
