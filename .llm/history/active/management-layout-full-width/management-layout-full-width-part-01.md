# management-layout-full-width

**Started:** 2026-05-07  
**Author:** Agent  
**Context:** Management-web page content width vs shared UI.

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

the management web page contents should be full width instead of overly width restricted. this may be happening because of a shared omopnent between mgmt web and web, and perhaps some component/s in podverse-ui need to be adapted to handle the differences between web and mgmt web layout

#### Key Decisions

- **`ManagementPageShell`** (used by management-web only; not by `apps/web`) applied `max-width: 1200px` and `margin: 0 auto`, which capped every admin page.
- Removed the max-width/centering; set **`width: 100%`** and **`min-width: 0`** so the shell fills the app content column and flex children (wide tables) can shrink/scroll correctly.

#### Files Created/Modified

- `packages/ui/src/components/layout/ManagementPageShell/ManagementPageShell.module.scss`
- `.llm/history/active/management-layout-full-width/management-layout-full-width-part-01.md`

---

### Session 2 - 2026-05-07

#### Prompt (Developer)

there should be enough padding left and right of the main content so that it aligns with the edge of the start of the navbar brand and that padding should also be on the right/end of that main content wrapper

#### Key Decisions

- Management **`NavBar`** (default `appearance="management"`) uses horizontal padding **`$spacing-lg`** in Sass, which maps to **`var(--spacing-2xl)`** — not `var(--spacing-lg)`.
- **`ManagementPageShell`** had **`padding: var(--spacing-lg)`** on all sides, so main content was inset **less** on the sides than the brand row; the dashboard title started left of the brand text and the right margin felt uneven.
- Set shell to **`padding: var(--spacing-lg) var(--spacing-2xl)`** (vertical unchanged, horizontal matches navbar) for aligned left/right gutters.

#### Files Created/Modified

- `packages/ui/src/components/layout/ManagementPageShell/ManagementPageShell.module.scss`
- `.llm/history/active/management-layout-full-width/management-layout-full-width-part-01.md`
