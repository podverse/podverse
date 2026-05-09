---
name: management-post-save-navigation
description: Post-save navigation to the canonical management-web list (or exit route) for one-row create/edit pages; exceptions for invite links and password-only updates.
---

# Management-web post-save navigation

**When to use:** When adding or changing **create** or **edit** pages in **`apps/management-web`**
that exist to create or update **one primary row** (users, admins, generic CRUD, etc.).

## Rule

After a successful **primary** save (POST create or PATCH/PUT profile/settings form), navigate to
the **canonical exit route**. Usually that is the **resource list** named in breadcrumbs:

- Use concrete paths (e.g. **`/users`**, **`/admins`**).
- Call **`router.refresh()`** after **`router.push`** when the destination list should reload server
  data.

## Exceptions

- **Invite / set-password URL** in the response — **do not** auto-redirect; keep copy UX (and an
  explicit control to return to the list). Same pattern as Metaboost **`UserForm`** when
  **`setPasswordLink`** is present.
- **Password-only** updates on a **tabbed user edit** — **stay** on the page with success feedback;
  do not redirect (matches Metaboost **`UserForm`**).
- **Database / table browser** or flows where the correct landing is **row detail** (e.g.
  **`CreateRowPageClient`** → **`/database/:table/:id`**).
- **Wizard / multi-step** flows (e.g. “create role” from admin form) follow that flow’s return URL.

## Cross-references

- List/table patterns: **`crud-tables-resources`**.
