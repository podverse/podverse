# Mobile E2E flows

Mobile E2E runs with Maestro/Detox under `apps/mobile/e2e/`.

Track 17.8 locale-switch flow:

- `locale-switch-home-smoke.yaml`

Suggested run command from monorepo root:

```bash
maestro test apps/mobile/e2e/locale-switch-home-smoke.yaml
```

After running, review screenshots in:

- `.artifacts/mobile-e2e-reports/latest/index.html`
