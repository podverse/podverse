# History — shared-ui-banner

## Metadata

- Started: 2026-05-07
- Author: Cursor agent
- Context: Extract generic Banner to `@podverse/ui`; web keeps membership-specific logic.

## Session 1 — 2026-05-07

#### Prompt (Developer)

@podverse/apps/web/src/components/Banner/MembershipExpiredBanner.tsx:1-35 abstract a banner component from this and move it to podverse packages/ui and MembershipExpiredBanner should be an implementation of it in web

#### Key Decisions

- Added `Banner` in `packages/ui` with `message`, optional `action`, `variant` (`danger`), and optional `role`; styling uses theme tokens (`--button-danger-bg`, `--button-danger-color`) and `:global(a)` in the action slot for framework-agnostic links.
- Removed `MembershipExpiredBanner.module.scss`; apps pass localized strings via props / children produced by the app.

#### Files Created/Modified

- `packages/ui/src/components/layout/Banner/Banner.tsx`
- `packages/ui/src/components/layout/Banner/Banner.module.scss`
- `packages/ui/src/components/layout/Banner/Banner.test.tsx`
- `packages/ui/src/index.ts`
- `apps/web/src/components/Banner/MembershipExpiredBanner.tsx`
- `apps/web/src/styles/components/Banner/MembershipExpiredBanner.module.scss` (removed)
