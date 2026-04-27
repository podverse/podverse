# Phase 2 — Switch `apps/web` to the package (byte-equivalent)

## Scope

Repoint `apps/web` to consume tokens, themes, mixins, and font-faces from `@podverse/ui/styles/*`. The compiled CSS must be visually identical to `main`.

## Prerequisite

Phase 1 (`01-package-tokens-and-exports.md`) is complete and `npm run -w @podverse/ui type-check && lint` passes.

## Strategy: thin forwarders, then delete

Replace each app-side SCSS partial with a one-line `@forward` to the package, run a build to verify compiled output is unchanged, then delete the now-redundant forwarders in Phase 4 once stable. This makes diffs reviewable file-by-file and keeps every existing `@use 'apps/web/.../foo'` import working until cleanup.

## Steps

### 1. Variables aggregator

`apps/web/src/styles/variables/index.scss` — replace contents:

```scss
@forward '@podverse/ui/styles/variables';
```

Verify Sass loader resolves the package spec. (Next.js with `sass` ≥ 1.x supports package `exports`.)

If `sass` complains about resolving `@podverse/ui/styles/variables`, fall back to a relative path:

```scss
@forward '../../../../packages/ui/src/styles/variables';
```

Use the package spec form first; only switch to the relative form if necessary, and document why in `apps/web/src/styles/README.md` if applicable.

### 2. UI themes aggregator

`apps/web/src/styles/ui-themes/index.scss` — replace contents:

```scss
@forward '@podverse/ui/styles/themes';
```

### 3. Mixins aggregator

`apps/web/src/styles/mixins/index.scss` — replace contents:

```scss
@forward '@podverse/ui/styles/mixins';
```

### 4. Font-faces

`apps/web/src/styles/font-faces.scss` — replace contents:

```scss
@forward '@podverse/ui/styles/font-faces';
```

### 5. Per-file partials (`apps/web/src/styles/variables/*.scss`, `apps/web/src/styles/ui-themes/{dark,light,dracula}.scss`, `apps/web/src/styles/mixins/*.scss`)

Leave them in place for this phase. Many files in `apps/web` use deep imports like:

- `@use '../../variables/breakpoints' as *;`
- `@use '../../mixins/media-queries' as *;`

These deep imports must continue resolving. Convert each per-file partial to a one-line forwarder so deep imports redirect to the package:

```scss
// apps/web/src/styles/variables/breakpoints.scss
@forward '@podverse/ui/styles/breakpoints';
```

```scss
// apps/web/src/styles/variables/spacing.scss   (and border-radius, element-sizes, font-size, font-weight, image-sizes, list-item-sizes — same pattern)
@forward '@podverse/ui/styles/variables';
```

```scss
// apps/web/src/styles/ui-themes/dark.scss   (and light.scss, dracula.scss)
@forward '@podverse/ui/styles/themes';
```

```scss
// apps/web/src/styles/mixins/media-queries.scss   (and the other 9 — buttons, ellipsis, flexbox, form, headers, layout, lineClamp, listRow, timeText)
@forward '@podverse/ui/styles/mixins';
```

Note: `@forward` from a single combined module re-emits the module's full content for any file that does deep imports. That is fine because Sass loads each module once per compilation unit.

### 6. Confirm `apps/web/src/styles/index.scss` is unchanged

```scss
@use 'font-faces';
@use 'variables';
@use 'ui-themes';
@use 'mixins';
@use 'keyframes';
@use 'globals';
```

Do not modify this file in Phase 2. Aggregator forwarders ensure each `@use` continues to work.

### 7. Verify deep mixin imports

Some files do not go through `mixins/index.scss` and instead `@use` an internal mixin partial. Run:

```bash
rg "@use '\.\./.*mixins/(buttons|ellipsis|flexbox|form|headers|layout|lineClamp|listRow|media-queries|timeText)'" apps/web/src/styles
rg "@use '\.\./.*variables/(border-radius|element-sizes|font-size|font-weight|image-sizes|list-item-sizes|spacing|breakpoints)'" apps/web/src/styles
```

For each match, the per-file forwarder added in step 5 makes the import resolve to the package. No edit needed.

## Verification

### Build + smoke

```bash
# Compile-time check — Sass must resolve all paths.
npm run -w @podverse/web build

# E2E smoke — visual regressions show up here.
make app_web_e2e_run_basic_smoke
```

### Manual visual diff

Open the running web app on a few representative routes and compare against `main`:

- `/` (home)
- `/podcasts`
- `/playlist/<id>`
- `/settings/general` (theme switcher works for dark/light/dracula)

Open DevTools and confirm `:root` has the expected CSS custom properties (e.g. `--spacing-md`, `--text-color-primary`) and that switching themes via the selector updates `<html data-ui-theme>`.

## Risk + mitigation

- **Sass `exports` support**: Older sass-loader configs may not honor package `exports`. If the Phase-1 verification step (`sass.compile`) succeeded, app builds will too. Otherwise, fall back to relative paths in step 1–4 and document the reason.
- **Hidden CSS drift**: A token rename in Phase 1 would silently break web. Phase 1 mandates "do not rename" — verify by running `git diff packages/ui/src/styles/_variables.scss` and confirming every `--…` name from web's old per-file partials appears in the new file.

## Definition of done

- `npm run -w @podverse/web build` succeeds.
- `make app_web_e2e_run_basic_smoke` passes.
- DevTools shows `--spacing-md`, `--text-color-primary`, etc. on `:root` in all three themes.
- No `apps/web/src/styles/{variables,ui-themes,font-faces,mixins}` file contains its original token definitions; each is a forwarder to `@podverse/ui/styles/*`.
- Web has zero visual diff vs `main`.
