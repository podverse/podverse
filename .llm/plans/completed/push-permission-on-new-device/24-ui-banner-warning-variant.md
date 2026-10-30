**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 24 — Shared UI: a `warning` variant on `Banner`

The shared `Banner` in `@podverse/ui` has one variant, `danger` (a solid danger fill, used by
`MembershipExpiredBanner` at the top of every web page). This plan adds a `warning` variant that
uses the theme's warning tint, so any web or management-web page can show a warning banner.
Plan 23 is its first caller (the device push banner at the top of notification settings).

Every decision below is settled. Transcribe; do not rename or change behavior.

## Rows

R17, R36

## Runs after

none

## Files

packages/ui/src/components/layout/Banner/Banner.tsx
packages/ui/src/components/layout/Banner/Banner.module.scss
packages/ui/src/components/layout/Banner/Banner.test.tsx

## Reuse and scope

- Extend the existing `Banner` (**ui-component-promotion** step 3: prefer a `variant` over a
  fork). Do not add a second banner component, and do not use `Alert` or `Callout`.
- The variant is colors only, like `danger`. Layout (padding, gap, the message and action slots,
  no border radius) stays shared, so a `warning` banner placed where a `danger` one sits looks the
  same apart from color.
- No new tokens. `--background-color-warning`, `--border-color-warning`, and
  `--text-color-primary` are defined in every theme block of `packages/ui/src/styles/_themes.scss`
  (dark, light, dracula, violet, ember, dawn), and `StatusBadge`'s warning variant already uses the
  first two. So `@podverse/design-tokens` and
  `docs/operations/branding/custom-themes.operator-sample.json` do not change
  (**styles-source-of-truth**).
- No copy in `@podverse/ui` (**shared-ui-i18n**); callers pass localized `message` and `action`.
- `BannerVariant` is already exported from `packages/ui/src/index.ts`; the index does not change.
- `danger` stays the default variant, so `MembershipExpiredBanner` (which passes
  `variant="danger"`) and any caller without `variant` are unchanged.

## Implementation

### `packages/ui/src/components/layout/Banner/Banner.tsx`

1. Change the variant type to:

```typescript
export type BannerVariant = 'danger' | 'warning';
```

1. Replace the doc comment above `export function Banner` with:

```typescript
/**
 * Full-width horizontal banner with optional trailing action; no default strings. `danger` is a
 * solid danger fill; `warning` is the theme's warning tint with a warning border.
 */
```

1. Replace the `className` of the root `div` with:

```tsx
      className={classNames(
        styles.root,
        variant === 'danger' && styles.danger,
        variant === 'warning' && styles.warning,
        className
      )}
```

Keep imports as they are (extensionless relatives; **import-specifiers-tiered** Tier C).

### `packages/ui/src/components/layout/Banner/Banner.module.scss`

Add this block directly after `.danger`:

```scss
.warning {
  background-color: var(--background-color-warning);
  border: 1px solid var(--border-color-warning);
  color: var(--text-color-primary);
}
```

`1px solid` matches `Alert`'s bordered variants. No `var()` fallbacks
(**css-custom-properties-no-var-fallbacks**). Do not change `.root`, `.danger`, `.message`, or
`.action`.

## Tests

`packages/ui/src/components/layout/Banner/Banner.test.tsx` (vitest, jsdom). Add
`import styles from './Banner.module.scss';` below the `Banner` import, the way
`RadioButton.test.tsx` imports its module styles, then add two cases inside the existing
`describe('Banner', …)`:

1. **"uses the danger style when no variant is given"**: render
   `<Banner message="Danger copy" role="alert" />`; `screen.getByRole('alert').className` contains
   `styles.danger` and does not contain `styles.warning`.
1. **"uses the warning style for the warning variant"**: render
   `<Banner message="Warning copy" role="status" variant="warning" />`;
   `screen.getByRole('status').className` contains `styles.warning` and does not contain
   `styles.danger`.

Keep the two existing cases unchanged. No E2E in this plan; plan 23's
`settings-notifications.spec.ts` cases render the warning banner on a real page.

## Release scratchpad

none (no shipped surface changes until plan 23 uses the variant; plan 23's entry covers the
visible banner)
