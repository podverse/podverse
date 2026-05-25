---
name: ui-component-promotion
description: Extract or deduplicate UI between apps/web and apps/management-web via packages/ui; thin app wrappers for Next and i18n.
version: 1.0.0
---


# ui-component-promotion

## When to use

- Extracting or deduplicating components between **web** and **management-web**.
- Parallel implementations of the same generic control appear in both apps.

## Steps

1. **Inventory** — find both implementations; list props, styles, and user-visible strings.
2. **Prop API** — design `@podverse/ui` surface with **no embedded user-facing copy** (see **`shared-ui-i18n`**).
3. **SCSS** — shared styles live under `packages/ui/src/components/**`; converge on the **web visual baseline** unless docs say otherwise (see **`prefer-shared-ui-web-management`**); prefer **`variant`** / **`appearance`** over forks.
4. **Export** — add the symbol to `packages/ui/src/index.ts`.
5. **App migration** — keep wrappers thin where required (`next/link`, `next-intl`, session guards). The same “thin wrapper” approach applies **inside one app** when identical configured usage repeats (see **`reusable-components`** — app-local configured wrappers).
6. **Tests** — unit tests for meaningful behavior in `packages/ui`; **E2E** when user-visible flows change (**`feature-implementation-testing`**).

## Related

- **`shared-ui-i18n`** — apps localize; `@podverse/ui` stays copy-free.
- **`reusable-components`** — default preference order and anti-patterns.
- **`feature-implementation-testing`** — integration vs E2E expectations by tier.
