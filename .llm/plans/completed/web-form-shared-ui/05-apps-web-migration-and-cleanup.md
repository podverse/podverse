# 05 — apps/web migration and cleanup

## Prompt (Agent)

Execute **phase 05**: migrate **all** `apps/web` imports from local `components/Form/` to
`@podverse/ui`; remove `apps/web/src/components/Form/` and unused
`apps/web/src/styles/components/Form/` modules; ensure `apps/web/AGENTS.md` guidance remains satisfied
(no pointless local re-export wrappers).

## Migration steps

1. Replace imports — prefer:

   ```ts
   import { TextInput, FormTextArea, CheckboxField, ... } from '@podverse/ui';
   ```

2. Delete obsolete directory `apps/web/src/components/Form/`.
3. Remove SCSS modules under `apps/web/src/styles/components/Form/` that only served those
   components (verify no `@forward` or other imports remain — grep for `styles/components/Form`).
4. Run `npm run lint` and web build from repo root (nix wrapper in agent environments).

## Call site clusters (non-exhaustive — grep for drift)

- **Auth:** `Auth*Form.tsx`, `ModalAuthLogin.tsx`
- **Settings:** `SettingsProfile`, `SettingsNotifications`, account modals
- **Boost:** `BoostFormFields.tsx`
- **Checkout:** `CheckoutPageClient.tsx`
- **Clip / Playlist / RSS / Modals / ItemTranscript / ListChannelSettings**

## Bundle note

Follow [`bundle-optimization`](../../../../.cursor/skills/bundle-optimization/SKILL.md) — promoted
components should not pull unnecessary deps into client chunks beyond today’s web behavior.

## Done criteria

- `rg 'components/Form'` under `apps/web` returns **no** imports from deleted paths.
- No orphan SCSS.
