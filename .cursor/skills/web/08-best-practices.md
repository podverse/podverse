# Best Practices Summary

## Quick Reference Checklist

1. **CRITICAL: ALWAYS use translations for ALL user-facing text** - Use `useTranslations()` hook, NEVER hardcode strings
2. **Always use TypeScript types** - No `any` types
3. **Server components by default** - Add `"use client"` only when needed
4. **SCSS Modules for styling** - Never Tailwind or CSS-in-JS
5. **Proper error handling** - Use `handleRateLimitAlert()` for API errors
6. **Accessibility first** - Include ARIA labels (use i18n for all aria-label text) and semantic HTML; use Font Awesome icons (e.g. FaXmark) instead of symbol characters (e.g. ×) for close/dismiss
7. **Follow existing patterns** - Look at similar components for reference (agent mode)
8. **Recommend improvements** - Propose better patterns when evaluating (plan mode)
9. **Type safety** - Use types from helper packages (`@podverse/helpers`, `@podverse/helpers-requests`, etc.)
10. **Document out-of-scope improvements** - Add to `apps/web/docs/todo/improvements.md` automatically
11. **Use constants instead of hardcoded values** - Define named constants in separate files for magic numbers, timeouts, limits, and configuration values
12. **CRITICAL: Always use constants for image paths** - All image paths from the public directory must be defined in `apps/web/src/constants/images.ts` under the `IMAGES` object. Never hardcode image paths like `"/images/..."` in components. Use `IMAGES.MOBILE.APP_STORES.APP_STORE` instead of `"/images/mobile/app-stores/..."`. See `04-configuration.md` for examples.
13. **CRITICAL: Reusable utilities go to helper packages** - If a utility function could be useful in React Native, other Next.js apps, or any other Podverse application, it belongs in the appropriate helper package (validation → `@podverse/helpers-validation`, requests → `@podverse/helpers-requests`, etc.), not in the web app. See `07-reusable-utilities.md` for package selection guidance.
14. **CRITICAL: Always use config object for environment variables** - Import and use `config` from `apps/web/src/config/index.ts` instead of accessing `process.env` directly. Update `.env.example` and all env files in `env/` directory when adding new variables
15. **Bundle awareness** - When adding deps, changing helpers, or adding heavy UI: measure with bundle analyzer (real JS size), prefer `sideEffects: false` in helpers, use subpath/named imports for heavy libs (e.g. date-fns), lazy-load below-the-fold UI, and do not import `@podverse/helpers-backend` or `@podverse/helpers-config` in client code. See [09-performance-optimization](09-performance-optimization.md) and [bundle-optimization skill](/.cursor/skills/bundle-optimization/SKILL.md).

## Translation Requirements (CRITICAL)

**MANDATORY**: Every string that users can see must use translations:

- Button labels: `{tMisc("submit")}` NOT `"Submit"`
- Error messages: `{tMisc("error_message")}` NOT `"Error occurred"`
- Placeholder text: `{tFeatures("search_placeholder")}` NOT `"Search..."`
- Development-only text visible to users: Still use translations
- Even in error pages: Use translations (with fallback for global-error.tsx)

**If you see hardcoded English strings in user-facing code, you MUST:**

1. Add the translation key to the correct catalog layer `packages/i18n-catalog/<layer>/originals/en-US.json` **ONLY** - Do NOT add translations to override files or other language files. `npm run i18n:translate` generates alternate languages.
2. Replace the hardcoded string with `useTranslations()` call
3. This applies to ALL components, pages, error boundaries, etc.

**CRITICAL**: When adding new translation keys:

- **Only edit catalog layer `packages/i18n-catalog/<layer>/originals/en-US.json`** - This is the authoring source of truth
- **Do NOT edit** override files or other language originals directly (except human corrections in `overrides/`)
- `npm run i18n:compile` writes merged output to `apps/*/i18n/compiled/`

## Accessibility: ARIA Labels and Icons

**ARIA labels are user-facing** — screen readers announce them, so they must use translations:

- Use `useTranslations()` for all `aria-label` values: `aria-label={tMisc('dismiss')}` NOT `aria-label="Dismiss"`
- Apply to buttons, links, and any element that has `aria-label`, `aria-labelledby`, or similar
- Add missing keys to the correct catalog layer `packages/i18n-catalog/<layer>/originals/en-US.json` (e.g. `misc.dismiss`, `misc.loading`) and use the hook in the component

**Use Font Awesome icons instead of symbol characters** for close/dismiss and other actions:

- Use icons from `react-icons/fa6` (e.g. `FaXmark` for close/dismiss) instead of typing `×` or other Unicode symbols
- Follow existing patterns: see `Modal.tsx` (close button uses `FaTimes`), `NavBarMoreButton.tsx` (uses `FaXmark`)
- Import only the icon you need: `import { FaXmark } from 'react-icons/fa6';`
- Pair the icon with a translated `aria-label` so screen reader users get the same meaning
