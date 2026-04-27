# Phase 1 — Build canonical token + theme + mixin + font-face layer in `@podverse/ui`

## Scope

Create the single source of truth for design tokens in `@podverse/ui`. After this phase, `@podverse/ui` exports SCSS sub-paths that both `apps/web` (Phase 2) and `apps/management-web` (Phase 3) consume.

This phase **does not** modify the apps. It only builds the package layer and updates the four package-internal SCSS module consumers.

## Source of truth

All token names and values come from `apps/web`. **Do not rename a single CSS custom property.** `apps/web` already references `--spacing-md`, `--text-color-primary`, `--background-color-secondary`, etc. in hundreds of places, and those must continue to resolve to identical values.

## Steps

### 1. Add SCSS sub-path exports to `packages/ui/package.json`

Edit `packages/ui/package.json`. Replace the `exports` block with:

```json
"exports": {
  ".": {
    "types": "./src/index.ts",
    "import": "./src/index.ts",
    "default": "./src/index.ts"
  },
  "./styles/variables": "./src/styles/_variables.scss",
  "./styles/breakpoints": "./src/styles/_breakpoints.scss",
  "./styles/mixins": "./src/styles/_mixins.scss",
  "./styles/themes": "./src/styles/_themes.scss",
  "./styles/font-faces": "./src/styles/_font-faces.scss",
  "./styles": "./src/styles/index.scss"
}
```

### 2. Create `packages/ui/src/styles/_breakpoints.scss`

Copy verbatim from `apps/web/src/styles/variables/breakpoints.scss`:

```scss
$breakpoint-xs-min: 0px;
$breakpoint-xs-max: 575px;

$breakpoint-sm-min: 576px;
$breakpoint-sm-max: 767px;

$breakpoint-md-min: 768px;
$breakpoint-md-max: 991px;

$breakpoint-lg-min: 992px;
$breakpoint-lg-max: 1199px;

$breakpoint-xl-min: 1200px;
$breakpoint-xl-max: 1399px;

$breakpoint-xxl-min: 1400px;
$breakpoint-xxl-max: 1599px;
```

### 3. Replace `packages/ui/src/styles/_variables.scss`

Overwrite the existing file. New content combines:

- The breakpoints SCSS (forwarded from `_breakpoints.scss`).
- All `:root { --… }` blocks from web's per-file partials (`border-radius`, `element-sizes`, `font-size`, `font-weight`, `image-sizes`, `list-item-sizes`, `spacing`).
- A small SCSS-mirror layer so package components can keep using familiar names (`$spacing-md`, `$color-text-secondary`, etc.). These mirror values are bound to the canonical `var(--…)` tokens so they automatically respect the active theme.

```scss
// Canonical Podverse design tokens. apps/web is the source of truth for values.
// Do NOT rename CSS custom properties — they are referenced across both apps.
//
// Usage:
//   @use '@podverse/ui/styles/variables' as *;
//   .x { padding: var(--spacing-md); color: $color-text-primary; }

@forward 'breakpoints';

:root {
  // border-radius
  --border-radius: 0.625rem;
  --border-radius-round: 100rem;

  // element sizes
  --navbar-desktop-height: 62px;
  --header-desktop-height: 80px;
  --header-mobile-height: 114px;
  --main-wrapper-desktop-height: calc(
    100vh - var(--navbar-desktop-height) - var(--header-desktop-height)
  );
  --main-wrapper-mobile-height: calc(
    100vh - var(--navbar-desktop-height) - var(--header-mobile-height)
  );
  --navbar-mobile-height: 48px;
  --sidebar-desktop-width: 12rem;
  --sidebar-mobile-width: 16rem;
  --button-border-size: 1.5px;
  --media-player-height: 100px;
  --media-player-height-mobile: 90px;
  --media-player-height-top-section: 28px;
  --media-player-height-top-section-negative: -28px;
  --form-max-width: 560px;

  // font-size
  --font-size-3xs: 0.5rem;
  --font-size-2xs: 0.625rem;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-md: 1.125rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
  --font-size-3xl: 2.5rem;

  // font-weight
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;

  // image sizes
  --image-size-xs: 1.25rem;
  --image-size-sm: 2.5rem;
  --image-size-md: 5rem;
  --image-size-lg: 10rem;
  --image-size-xl: 20rem;

  // list-item sizes
  --list-item-button-size: 2.25rem;
  --large-item-size: 3rem;

  // spacing scale
  --spacing-none: 0;
  --spacing-xs: 0.125rem;
  --spacing-sm: 0.25rem;
  --spacing-md: 0.5rem;
  --spacing-base: 0.75rem;
  --spacing-lg: 1rem;
  --spacing-xl: 1.25rem;
  --spacing-2xl: 1.5rem;
  --spacing-3xl: 1.75rem;
  --spacing-4xl: 2rem;

  // semantic spacing
  --spacing-section-y: 1.5rem 0;
  --spacing-section-bottom: 1.5rem;
  --spacing-section-top: 1.5rem;
  --spacing-form-input: 0.5rem 1rem;
  --spacing-form-input-vertical: 0.25rem 0;
  --spacing-form-input-inner: 0.25rem 0 0.25rem 0;
  --spacing-form-label-bottom: 2px;
  --spacing-form-label-bottom-rem: 0.125rem;
  --spacing-button-default: 0 1rem;
  --spacing-button-small: 0 0.75rem;
  --spacing-button-medium: 0 1rem;
  --spacing-button-large: 0 16px;
  --spacing-modal-content: 1.5rem;
  --spacing-modal-padding: 1.5rem 1.5rem 2rem 1.5rem;
  --spacing-container: 1rem 1.25rem;
  --spacing-container-y: 1rem 0;
  --spacing-container-top: 1rem;
  --spacing-card-padding: 1rem 0.5rem;
  --spacing-card-padding-full: 1rem;
  --spacing-gap-base: 0.5rem;
  --spacing-gap-sm: 0.25rem;
  --spacing-gap-lg: 1rem;
  --spacing-gap-xl: 1.25rem;
  --spacing-gap-2xl: 1.5rem;
  --spacing-gap-3xl: 1.75rem;
  --spacing-gap-4xl: 2rem;
  --spacing-modal-side: 100px;

  // legacy aliases (kept for byte-equivalence with apps/web)
  --header-padding: var(--spacing-container);
  --form-gap: var(--spacing-3xl);

  // shadow + transition (NEW canonical tokens used by management-web)
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.1);
  --transition-default: 0.2s;
}

// SCSS-mirror layer — package components keep using these familiar names.
// Values bind to var(--…) so theme changes apply automatically.
$spacing-xs: var(--spacing-md);    // mirrors mgmt-web's 0.5rem
$spacing-sm: var(--spacing-base);  // 0.75rem
$spacing-md: var(--spacing-lg);    // 1rem
$spacing-lg: var(--spacing-2xl);   // 1.5rem
$spacing-xl: var(--spacing-4xl);   // 2rem

$border-radius-sm: var(--border-radius);
$border-radius-md: var(--border-radius);
$border-width: 1px;

$font-size-sm: var(--font-size-sm);
$font-size-base: var(--font-size-base);
$font-size-lg: var(--font-size-lg);
$font-size-xl: var(--font-size-xl);
$font-weight-medium: var(--font-weight-medium);
$font-weight-semibold: var(--font-weight-bold);

// Theme-dependent — values come from _themes.scss at runtime.
$color-text: var(--text-color-primary);
$color-text-secondary: var(--text-color-secondary);
$color-background: var(--background-color-secondary);
$color-background-card: var(--background-color-tertiary);
$color-border: var(--border-color-tertiary);
$color-border-light: var(--border-color-opaque);
$color-primary: var(--border-color-primary);
$color-on-primary: var(--text-color-tertiary);
```

### 4. Create `packages/ui/src/styles/_themes.scss`

Copy the three files from `apps/web/src/styles/ui-themes/` verbatim, plus extra tokens that management-web needs (`--background-color-error`, `--border-color-error`, `--text-color-success`, `--background-color-success`, `--text-color-warning`, `--background-color-warning`). Each new token must be defined in **all three** theme blocks.

```scss
// Default theme (dark) — declared on :root so apps without a theme attribute still render.
:root,
[data-ui-theme='dark'] {
  --background-color-primary: #030626;
  --background-color-secondary: #000000;
  --background-color-tertiary: #0f1235;
  --background-color-quaternary: #20244e;
  --background-color-special: #1e2a44;
  --background-color-opaque: rgba(255, 255, 255, 0.15);
  --background-color-glow: rgba(37, 42, 100, 0.6);
  --background-color-contrast: #ffffff;
  --background-color-error: rgba(227, 52, 47, 0.18);
  --background-color-success: rgba(80, 250, 123, 0.18);
  --background-color-warning: rgba(244, 162, 79, 0.18);

  --border-color-primary: #3d9dfe;
  --border-color-secondary: #ffffff;
  --border-color-tertiary: #444444;
  --border-color-warning: #f4a24f;
  --border-color-error: #aa1e2b;
  --border-color-opaque: rgba(255, 255, 255, 0.15);

  --box-shadow-focus: 0 0 0 4px rgba(0, 116, 217, 0.4);

  --text-color-primary: #ffffff;
  --text-color-secondary: #cccccc;
  --text-color-tertiary: #000000;
  --text-color-accent: #3d9dfe;
  --text-color-link: #74a8dc;
  --text-color-link-hover: #49a4ff;
  --text-color-contrast: #333333;
  --text-color-highlighted: #f4a24f;
  --text-color-danger: #e3342f;
  --text-color-success: #50fa7b;
  --text-color-warning: #f4a24f;

  --text-line-height: 1.35;

  --progress-bar-before: #ffffff;
  --progress-bar-after: #252a64;
  --progress-bar-highlighted: rgba(61, 157, 254, 0.5);
  --progress-chapter-marker: var(--text-color-accent);
}

:root,
[data-ui-theme='dark'] {
  --background-gradient-primary: linear-gradient(
    90deg,
    rgba(23, 59, 140, 0.81) -3%,
    var(--background-color-tertiary)
  );

  --button-primary-bg: var(--border-color-primary);
  --button-primary-color: var(--text-color-tertiary);
  --button-primary-bg-hover: var(--text-color-link-hover);
  --button-secondary-bg: var(--background-color-glow);
  --button-secondary-color: var(--text-color-primary);
  --button-secondary-bg-hover: #34397b;
  --button-success-bg: #15803d;
  --button-success-color: var(--text-color-primary);
  --button-success-bg-hover: #1e9c53;
  --button-warning-bg: #f4a24f;
  --button-warning-color: var(--text-color-primary);
  --button-warning-bg-hover: #ffb84d;
  --button-highlight-bg: #ffd600;
  --button-highlight-bg-hover: #ffe066;
  --button-danger-bg: #bd2130;
  --button-danger-color: var(--text-color-primary);
  --button-danger-bg-hover: #e3342f;
  --button-outline-color: var(--border-color-primary);
  --button-opaque-bg: rgba(30, 128, 227, 0.16);
  --button-opaque-warning-bg: rgba(244, 162, 79, 0.16);
  --button-opaque-danger-bg: rgba(196, 55, 69, 0.16);
  --button-opaque-danger-border: #aa1e2b;
  --button-enabled-icon-color: var(--text-color-accent);
}

[data-ui-theme='light'] {
  --background-color-primary: #f5f5f7;
  --background-color-secondary: #ffffff;
  --background-color-tertiary: #e8e8ed;
  --background-color-quaternary: #d1d1d6;
  --background-color-special: #dce4ed;
  --background-color-opaque: rgba(0, 0, 0, 0.08);
  --background-color-glow: rgba(200, 205, 230, 0.6);
  --background-color-contrast: #1d1d1f;
  --background-color-error: rgba(214, 48, 49, 0.12);
  --background-color-success: rgba(39, 174, 96, 0.12);
  --background-color-warning: rgba(230, 126, 34, 0.12);

  --border-color-primary: #0071e3;
  --border-color-secondary: #1d1d1f;
  --border-color-tertiary: #c7c7cc;
  --border-color-warning: #e67e22;
  --border-color-error: #c0392b;
  --border-color-opaque: rgba(0, 0, 0, 0.12);

  --box-shadow-focus: 0 0 0 4px rgba(0, 113, 227, 0.3);

  --text-color-primary: #1d1d1f;
  --text-color-secondary: #515154;
  --text-color-tertiary: #ffffff;
  --text-color-accent: #0071e3;
  --text-color-link: #0066cc;
  --text-color-link-hover: #0077ed;
  --text-color-contrast: #f5f5f7;
  --text-color-highlighted: #e67e22;
  --text-color-danger: #d63031;
  --text-color-success: #27ae60;
  --text-color-warning: #e67e22;

  --text-line-height: 1.35;

  --progress-bar-before: #0071e3;
  --progress-bar-after: #d1d1d6;
  --progress-bar-highlighted: rgba(0, 113, 227, 0.4);
  --progress-chapter-marker: var(--text-color-primary);
}

[data-ui-theme='light'] {
  --background-gradient-primary: linear-gradient(
    90deg,
    rgba(200, 220, 255, 0.8) -3%,
    var(--background-color-tertiary)
  );

  --button-primary-bg: var(--border-color-primary);
  --button-primary-color: var(--text-color-tertiary);
  --button-primary-bg-hover: var(--text-color-link-hover);
  --button-secondary-bg: var(--background-color-glow);
  --button-secondary-color: var(--text-color-primary);
  --button-secondary-bg-hover: #c4c9de;
  --button-success-bg: #27ae60;
  --button-success-color: var(--text-color-tertiary);
  --button-success-bg-hover: #2ecc71;
  --button-warning-bg: #e67e22;
  --button-warning-color: var(--text-color-tertiary);
  --button-warning-bg-hover: #f39c12;
  --button-highlight-bg: #f1c40f;
  --button-highlight-bg-hover: #f4d03f;
  --button-danger-bg: #c0392b;
  --button-danger-color: var(--text-color-tertiary);
  --button-danger-bg-hover: #e74c3c;
  --button-outline-color: var(--border-color-primary);
  --button-opaque-bg: rgba(0, 113, 227, 0.1);
  --button-opaque-warning-bg: rgba(230, 126, 34, 0.1);
  --button-opaque-danger-bg: rgba(192, 57, 43, 0.1);
  --button-opaque-danger-border: #a93226;
  --button-enabled-icon-color: var(--text-color-accent);
}

[data-ui-theme='dracula'] {
  --background-color-primary: #282a36;
  --background-color-secondary: #1e1f29;
  --background-color-tertiary: #343746;
  --background-color-quaternary: #44475a;
  --background-color-special: #3d4158;
  --background-color-opaque: rgba(255, 255, 255, 0.1);
  --background-color-glow: rgba(68, 71, 90, 0.7);
  --background-color-contrast: #f8f8f2;
  --background-color-error: rgba(255, 85, 85, 0.18);
  --background-color-success: rgba(80, 250, 123, 0.18);
  --background-color-warning: rgba(255, 184, 108, 0.18);

  --border-color-primary: #bd93f9;
  --border-color-secondary: #f8f8f2;
  --border-color-tertiary: #6272a4;
  --border-color-warning: #ffb86c;
  --border-color-error: #cc4444;
  --border-color-opaque: rgba(255, 255, 255, 0.15);

  --box-shadow-focus: 0 0 0 4px rgba(189, 147, 249, 0.4);

  --text-color-primary: #f8f8f2;
  --text-color-secondary: #bfc9db;
  --text-color-tertiary: #282a36;
  --text-color-accent: #bd93f9;
  --text-color-link: #8be9fd;
  --text-color-link-hover: #a4f4ff;
  --text-color-contrast: #282a36;
  --text-color-highlighted: #ffb86c;
  --text-color-danger: #ff5555;
  --text-color-success: #50fa7b;
  --text-color-warning: #ffb86c;

  --text-line-height: 1.35;

  --progress-bar-before: #bd93f9;
  --progress-bar-after: #44475a;
  --progress-bar-highlighted: rgba(189, 147, 249, 0.5);
  --progress-chapter-marker: var(--text-color-highlighted);
}

[data-ui-theme='dracula'] {
  --background-gradient-primary: linear-gradient(
    90deg,
    rgba(98, 114, 164, 0.6) -3%,
    var(--background-color-tertiary)
  );

  --button-primary-bg: var(--border-color-primary);
  --button-primary-color: var(--text-color-tertiary);
  --button-primary-bg-hover: #caa8fc;
  --button-secondary-bg: var(--background-color-glow);
  --button-secondary-color: var(--text-color-primary);
  --button-secondary-bg-hover: #565970;
  --button-success-bg: #50fa7b;
  --button-success-color: var(--text-color-tertiary);
  --button-success-bg-hover: #69fb8f;
  --button-warning-bg: #ffb86c;
  --button-warning-color: var(--text-color-primary);
  --button-warning-bg-hover: #ffc98a;
  --button-highlight-bg: #f1fa8c;
  --button-highlight-bg-hover: #f5fba8;
  --button-danger-bg: #ff5555;
  --button-danger-color: var(--text-color-primary);
  --button-danger-bg-hover: #ff6e6e;
  --button-outline-color: var(--border-color-primary);
  --button-opaque-bg: rgba(189, 147, 249, 0.16);
  --button-opaque-warning-bg: rgba(255, 184, 108, 0.16);
  --button-opaque-danger-bg: rgba(255, 85, 85, 0.16);
  --button-opaque-danger-border: #cc4444;
  --button-enabled-icon-color: var(--text-color-accent);
}
```

The new tokens (`--background-color-error/success/warning`, `--border-color-error`, `--text-color-success/warning`) do not change `apps/web` visually because no web file references them today.

### 5. Create `packages/ui/src/styles/_mixins.scss`

Move all 10 mixin partials from `apps/web/src/styles/mixins/` to `packages/ui/src/styles/mixins/`:

```text
packages/ui/src/styles/mixins/
  _buttons.scss
  _ellipsis.scss
  _flexbox.scss
  _form.scss
  _headers.scss
  _layout.scss
  _lineClamp.scss
  _listRow.scss
  _media-queries.scss
  _timeText.scss
```

For each, copy the body verbatim from `apps/web/src/styles/mixins/<name>.scss` to `packages/ui/src/styles/mixins/_<name>.scss`. The only edit is the internal import in `_media-queries.scss`:

- Old: `@use '../variables/breakpoints' as *;`
- New: `@use '../breakpoints' as *;`

Then create `packages/ui/src/styles/_mixins.scss` aggregator:

```scss
@forward 'mixins/buttons';
@forward 'mixins/ellipsis';
@forward 'mixins/flexbox';
@forward 'mixins/form';
@forward 'mixins/headers';
@forward 'mixins/layout';
@forward 'mixins/lineClamp';
@forward 'mixins/listRow';
@forward 'mixins/media-queries';
@forward 'mixins/timeText';
```

### 6. Create `packages/ui/src/styles/_font-faces.scss`

Copy from `apps/web/src/styles/font-faces.scss` verbatim. The font URL paths (`/fonts/Roboto/...`) are intentionally absolute so each consuming app must serve the assets from `public/fonts/`. Phase 3a copies the assets to `apps/management-web/public/fonts/`.

```scss
@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto/Roboto-Light.ttf') format('truetype');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto/Roboto-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto/Roboto-Italic.ttf') format('truetype');
  font-weight: 400;
  font-style: Italic;
  font-display: swap;
}

@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto/Roboto-Medium.ttf') format('truetype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto/Roboto-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: 'Roboto', Arial, Helvetica, sans-serif;
}
```

### 7. Create `packages/ui/src/styles/index.scss`

```scss
@use 'font-faces';
@use 'variables' as *;
@use 'themes';
@use 'mixins' as *;
```

(Order matches `apps/web/src/styles/index.scss` — font-faces before variables before themes before mixins.)

### 8. Update package-internal SCSS module consumers

Four files currently consume `_variables.scss` via `@use '../../../styles/variables' as *;`. Their existing SCSS variable references (e.g. `$spacing-md`, `$color-primary`) keep working because the new `_variables.scss` keeps the same names — they now bind to `var(--…)` tokens, so themes flow through automatically.

Files (no rename needed; just verify they compile):

- `packages/ui/src/components/navigation/NavBar/NavBar.module.scss`
- `packages/ui/src/components/navigation/NavCardGrid/NavCardGrid.module.scss`
- `packages/ui/src/components/navigation/Pagination/Pagination.module.scss`
- `packages/ui/src/components/table/Table/Table.module.scss`

**Required edit in `Pagination.module.scss`**: the line `&:hover { background: darken($color-primary, 8%); }` will fail because `darken()` cannot operate on a CSS custom property. Replace with:

```scss
&:hover {
  background: var(--button-primary-bg-hover);
}
```

This is theme-aware and matches what web does for primary button hover states.

## Verification

```bash
# Type-check + lint the package
npm run -w @podverse/ui type-check
npm run -w @podverse/ui lint

# Smoke-compile the package SCSS by building either app (later phases use this).
# At minimum, sanity-check that Sass can resolve the new module specifiers:
node -e "
  const sass = require('sass');
  sass.compile('packages/ui/src/styles/index.scss', {
    loadPaths: ['node_modules']
  });
  console.log('OK');
"
```

## Definition of done

- New files exist:
  - `packages/ui/src/styles/_breakpoints.scss`
  - `packages/ui/src/styles/_variables.scss` (replaced)
  - `packages/ui/src/styles/_themes.scss`
  - `packages/ui/src/styles/_mixins.scss`
  - `packages/ui/src/styles/_font-faces.scss`
  - `packages/ui/src/styles/index.scss`
  - `packages/ui/src/styles/mixins/_*.scss` (10 partials)
- `packages/ui/package.json` exports the new SCSS sub-paths.
- The four package SCSS modules still compile.
- No app files touched in this phase.
