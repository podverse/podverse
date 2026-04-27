# Phase 3a — Management globals, theme wrapper, theme switcher, fonts

## Scope

Wire `apps/management-web` to consume `@podverse/ui/styles/*` for globals, install Roboto font assets, set `data-ui-theme` on the root `<html>`, and add a theme switcher to management chrome (`ManagementUserMenu`). Module-level SCSS migrations are done in Phase 3b (parallel groups).

## Prerequisites

- Phase 1 complete: `@podverse/ui/styles/*` exports are live.
- Phase 2 complete: web builds and matches `main`.

## Steps

### 1. Copy Roboto font assets

Source: `apps/web/public/fonts/Roboto/`
Destination: `apps/management-web/public/fonts/Roboto/`

Files to copy (5 .ttf files):

- `Roboto-Light.ttf`
- `Roboto-Regular.ttf`
- `Roboto-Italic.ttf`
- `Roboto-Medium.ttf`
- `Roboto-Bold.ttf`

The `_font-faces.scss` partial uses absolute URLs (`/fonts/Roboto/...`), so each Next.js app must serve the files from its own `public/`.

```bash
mkdir -p apps/management-web/public/fonts/Roboto
cp apps/web/public/fonts/Roboto/*.ttf apps/management-web/public/fonts/Roboto/
```

### 2. Rewrite `apps/management-web/src/styles/index.scss`

Replace the entire file:

```scss
// Root styles for management-web. Tokens, themes, mixins, and font-faces all
// come from @podverse/ui so management-web stays in sync with apps/web.
@use '@podverse/ui/styles/font-faces';
@use '@podverse/ui/styles/variables' as *;
@use '@podverse/ui/styles/themes';
@use '@podverse/ui/styles/mixins';

// Reset
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-color-primary);
  background-color: var(--background-color-secondary);
}

#root {
  min-height: 100vh;
}
```

The body's `font-family` and `line-height` are intentionally not overridden — the package's `_font-faces.scss` already sets `font-family: 'Roboto', Arial, Helvetica, sans-serif;` on `body`, and themes set `--text-line-height` (apply via `line-height: var(--text-line-height);` only where needed).

Drop the old utility classes (`.container`, `.page-header`, etc.) — they are unused in current management-web markup. (Verify with `rg "page-header|page-title|page-subtitle" apps/management-web` before removing; if any matches exist outside `index.scss` itself, replace those usages with module-scoped equivalents in the same commit.)

### 3. Add theme support to `apps/management-web/src/app/layout.tsx`

Read the current file. Add:

- An SSR theme value resolved from a cookie (default `dark`).
- `data-ui-theme={ssrUITheme}` on `<html>`.

Reuse the lightweight helper from `apps/web/src/utils/localSettings/uiTheme.ts` — copy `UITheme` type + `toUITheme(...)` + `ALL_POSSIBLE_THEMES` into a new file `apps/management-web/src/utils/uiTheme.ts`. Do not pull in `apps/web`'s `getValidThemes()`/`getDefaultTheme()` — management-web has no per-brand theme config; hard-code valid = all three, default = `dark`.

`apps/management-web/src/utils/uiTheme.ts`:

```ts
export type UITheme = 'dark' | 'light' | 'dracula';

const ALL_THEMES: UITheme[] = ['dark', 'light', 'dracula'];

const DEFAULT_THEME: UITheme = 'dark';

export function toUITheme(value?: string | null): UITheme {
  if (!value) return DEFAULT_THEME;
  const t = value.toLowerCase() as UITheme;
  return ALL_THEMES.includes(t) ? t : DEFAULT_THEME;
}

export const UI_THEME_COOKIE = 'mgmt_ui_theme';

export function getValidThemes(): readonly UITheme[] {
  return ALL_THEMES;
}
```

In `layout.tsx`, read the cookie via `next/headers`:

```tsx
import { cookies } from 'next/headers';
import { toUITheme, UI_THEME_COOKIE } from '../utils/uiTheme';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // … existing code …
  const cookieStore = await cookies();
  const ssrUITheme = toUITheme(cookieStore.get(UI_THEME_COOKIE)?.value);
  // … existing code …
  return (
    <html lang={locale} data-ui-theme={ssrUITheme}>
      {/* … existing children … */}
    </html>
  );
}
```

Set `<body>`'s background via the global stylesheet (already done in step 2).

### 4. Add a theme switcher

Create `apps/management-web/src/components/ManagementThemeSwitcher/ManagementThemeSwitcher.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

import type { UITheme } from '../../utils/uiTheme';
import { getValidThemes, toUITheme, UI_THEME_COOKIE } from '../../utils/uiTheme';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const ManagementThemeSwitcher = () => {
  const [theme, setTheme] = useState<UITheme>('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-ui-theme');
    setTheme(toUITheme(current));
  }, []);

  const handleChange = (next: UITheme) => {
    document.documentElement.setAttribute('data-ui-theme', next);
    document.cookie = `${UI_THEME_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    setTheme(next);
  };

  return (
    <select
      aria-label="UI theme"
      value={theme}
      onChange={(e) => handleChange(toUITheme(e.target.value))}
    >
      {getValidThemes().map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
};
```

Mount it inside `ManagementUserMenu` (so it lives in the top-right chrome alongside log-out). Add to `apps/management-web/src/components/ManagementUserMenu/ManagementUserMenu.tsx`. Keep the component minimal; styling can be refined post-migration.

### 5. Verify Sass loader resolves package SCSS

Run:

```bash
npm run -w @podverse/management-web build
```

If Next.js fails to resolve `@podverse/ui/styles/variables`, the loader does not honor package `exports`. Workaround: replace the four package specs in `apps/management-web/src/styles/index.scss` with relative paths (`../../../../packages/ui/src/styles/...`). Document the reason in a code comment if you take this path.

### 6. Smoke check before Phase 3b

The 24 module SCSS files still import `../../../styles/theme/variables` and the file still exists (it will be deleted in Phase 4). The build will succeed because the legacy `_variables.scss` is untouched in this phase.

```bash
# Boot dev server and confirm:
# - dark theme renders by default
# - DevTools shows :root has --text-color-primary, --spacing-md, etc.
# - theme switcher cycles dark → light → dracula and persists across hard reload
npm run -w @podverse/management-web dev
```

## Definition of done

- `apps/management-web/public/fonts/Roboto/*.ttf` exists (5 files).
- `apps/management-web/src/styles/index.scss` consumes `@podverse/ui/styles/*` and contains no token literals.
- `apps/management-web/src/utils/uiTheme.ts` exists.
- `<html data-ui-theme="...">` is set in management root layout, hydrating from cookie.
- `ManagementThemeSwitcher` is mounted in chrome and persists across reload.
- Dev build boots; existing pages still render (using legacy `theme/variables` until Phase 3b).
