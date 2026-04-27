# Phase 3b — Group C: management UI component modules

## Scope

Migrate 8 SCSS module files for management-web's local UI components (`Alert`, `Button`, `Card`, `CenterContainer`, `Form/*`, `LoadingText`).

Runs in parallel with Group A (`04-`) and Group B (`05-`). Each group touches disjoint files.

## Files

1. `apps/management-web/src/components/ui/Alert/Alert.module.scss`
2. `apps/management-web/src/components/ui/Button/Button.module.scss`
3. `apps/management-web/src/components/ui/Card/Card.module.scss`
4. `apps/management-web/src/components/ui/CenterContainer/CenterContainer.module.scss`
5. `apps/management-web/src/components/ui/Form/FormGroup.module.scss`
6. `apps/management-web/src/components/ui/Form/FormInput.module.scss`
7. `apps/management-web/src/components/ui/Form/FormLabel.module.scss`
8. `apps/management-web/src/components/ui/LoadingText/LoadingText.module.scss`

## Procedure

Apply the procedure documented in `04-management-modules-group-a-pages.md` (steps 1–4) to each file. Token map is identical.

## Notes specific to this group

### Alert

`Alert.module.scss` references `theme.$color-error-bg` and `theme.$color-error-border`. These map to `var(--background-color-error)` and `var(--border-color-error)` — both are added in Phase 1's `_themes.scss` for all three themes.

```scss
.alertError {
  @extend .alert;
  background-color: var(--background-color-error);
  border: 1px solid var(--border-color-error);
  color: var(--text-color-danger);
}
```

### Button

`Button.module.scss` uses `theme.$color-disabled` and `theme.$transition-default`:

```scss
.button {
  width: 100%;
  padding: var(--spacing-base);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--text-color-tertiary);
  background-color: var(--border-color-primary);
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color var(--transition-default);

  &:disabled {
    background-color: var(--text-color-secondary);
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    opacity: 0.9;
  }
}
```

### FormInput

```scss
.formInput {
  width: 100%;
  padding: var(--spacing-base);
  font-size: var(--font-size-base);
  border: 1px solid var(--border-color-tertiary);
  border-radius: var(--border-radius);
  box-sizing: border-box;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    border-color: var(--border-color-primary);
  }
}
```

### Card

If `Card.module.scss` references `theme.$shadow-card`, replace with `var(--shadow-card)` (added in Phase 1).

## Verification

```bash
npm run -w @podverse/management-web type-check
npm run -w @podverse/management-web build

rg "theme\.\$" apps/management-web/src/components/ui
```

Expected: zero matches.

Visual smoke (after all three groups complete):

```bash
make app_management_web_e2e_run_basic_smoke
```

## Definition of done

- All 8 files import `@podverse/ui/styles/variables` (no `theme/variables`).
- All `theme.$…` references replaced.
- Alerts (error/success/warning), buttons, form inputs, and cards render correctly in all three themes.
- `npm run -w @podverse/management-web build` passes.
