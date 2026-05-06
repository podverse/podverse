# Phase 0 — Inventory sweep (Shared UI consolidation)

## Goal

Produce a durable map of **duplicated UI patterns** and **component forks** before moving code into
`packages/ui`.

## Steps

### 1. Management-web SCSS audit

- Enumerate all `*.module.scss` under `apps/management-web/src/app/`.
- Cluster repeated class families, including at minimum:
  - `.breadcrumbs`, `.breadcrumbLink`, `.breadcrumbSep` (and variants like `.bread`, `.breadLink`)
  - Definition-list / two-column grids (e.g. `.dl`, `.valueRow`, `.valueTerm`, `.valueDesc`)
  - Section/page chrome (`.header`, `.section`, `.pageSubtitle`, `.h2`/`.h3` stacks)
  - Muted text, inline links, confirm panels, textarea/select styling duplicated across pages
- For each cluster: list **file paths** and approximate **occurrence count**.

### 2. Management-web TSX audit

- For each route/page client under `apps/management-web/src/app/`, record:
  - Imports from `@podverse/ui`
  - Imports from `apps/management-web/src/components/ui/*`
  - Raw `<button>`, `<input>`, `<select>`, `<textarea>` with local classes (grep-assisted)

### 3. Web cross-reference

- Under `apps/web/src/components/`, list primary primitives: `Button`, `Form/*`, and any partial
  overlap with management’s `src/components/ui/*`.
- Note **API surface differences** (e.g. web `TextInput` is controlled + feature-rich vs
  management `FormInput` thin wrapper).

### 4. Packages/ui baseline

- Document current exports from `packages/ui/src/index.ts` and existing form helpers (e.g.
  `FormPrimaryActions`, `CheckboxField`, `Table`).

## Deliverable

Save a single artifact (markdown table or checklist) under the feature history or docs as you
prefer, for example:

| Pattern | Example files | Proposed `@podverse/ui` name | Risk (L/M/H) | Notes |

Minimum rows: breadcrumbs, key-value/dl grid, button duplication, form input duplication,
card/alert/loading.

## Verification

- No code behavior change required for this phase; optional commit that adds only the inventory
  doc.

## Completion

Mark Prompt 1 complete in `COPY-PASTA.md` before starting Phase 1.
