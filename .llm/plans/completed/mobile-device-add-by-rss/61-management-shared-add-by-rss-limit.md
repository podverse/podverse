**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 61 — Management: one Add by RSS limit field

Plan 60 replaced `trialMaxAddByRSSFeeds` and `premiumMaxAddByRSSFeeds` with one
`maxAddByRSSFeeds` on `ResolvedProductMembership` and on
`BillingPriceCatalogService.updateProductMembershipSettings`. The management API, its request
package, and management-web still use the two fields. Move every one of them to the single
field. The manual-refresh fields stay per tier.

## Rows

R28

## Runs after

60

## Files

apps/management-api/src/schemas/productMembership.ts
apps/management-api/src/routes/product/productMembership.ts
apps/management-api/openapi.yml
apps/management-api/src/routes/productMembership.integration.test.ts
apps/management-api/src/routes/users.integration.test.ts
packages/management-api-requests/src/productMembership.ts
apps/management-web/src/lib/createUserFormDefaults.ts
apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx
apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx
apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx
apps/management-web/e2e/products-hub.spec.ts
apps/management-web/e2e/users-new-create-username-only.spec.ts
apps/management-web/e2e/users-edit-advanced-overrides.spec.ts
apps/management-web/e2e/users-detail-force-logout.spec.ts
packages/i18n-catalog/management/originals/en-US.json
packages/i18n-catalog/management/originals/es.json
packages/i18n-catalog/management/originals/fr.json
packages/i18n-catalog/management/originals/el-GR.json
packages/i18n-catalog/management/overrides/es.json (by `npm run i18n:compile` only)
packages/i18n-catalog/management/overrides/fr.json (by `npm run i18n:compile` only)
packages/i18n-catalog/management/overrides/el-GR.json (by `npm run i18n:compile` only)
release-notes/scratchpad.md

## 1. Management API

- `apps/management-api/src/schemas/productMembership.ts`: in
  `updateProductMembershipSettingsBodySchema`, replace `trialMaxAddByRSSFeeds` and
  `premiumMaxAddByRSSFeeds` with `maxAddByRSSFeeds: Joi.number().integer().min(0).optional()`,
  and in the `.or(...)` list replace the two names with `'maxAddByRSSFeeds'`.
- `apps/management-api/src/routes/product/productMembership.ts` (the PATCH handler): the
  `updates` type, the two `if (value.… !== undefined)` copies, and the two `afterSnapshot`
  entries become one each: `updates.maxAddByRSSFeeds` and
  `afterSnapshot.max_add_by_rss_feeds`.
- `apps/management-api/openapi.yml`, around lines 1214–1270: in both schemas there, replace the
  `trialMaxAddByRSSFeeds` and `premiumMaxAddByRSSFeeds` properties with one
  `maxAddByRSSFeeds` (integer, minimum 0, description "Add by RSS feed limit shared by Trial and
  Premium; a per-account override still wins."), and in the `required` list replace the two
  names with `maxAddByRSSFeeds`.
- `apps/management-api/src/routes/productMembership.integration.test.ts`: every fixture and
  matcher with the two fields uses `maxAddByRSSFeeds` (use the Trial value the fixture had, for
  example `10` at line 63 and `12` at line 226). The PATCH case sends
  `{ maxAddByRSSFeeds: 12 }`, expects the service called with `maxAddByRSSFeeds: 12`, and expects
  `res.body.data.maxAddByRSSFeeds` to be 12.
- `apps/management-api/src/routes/users.integration.test.ts`: the three resolved-membership
  fixtures (lines 79–84, 163–168, 711–716) carry `maxAddByRSSFeeds: 10` in place of the two.

## 2. Request package

`packages/management-api-requests/src/productMembership.ts`: the update params type takes
`maxAddByRSSFeeds?: number` in place of the two.

## 3. Management web

- `apps/management-web/src/lib/createUserFormDefaults.ts`:
  `fallbackProductMembershipFromEnv` returns `maxAddByRSSFeeds: 100` in place of the two;
  `resolvedTierEntitlements` uses `product.maxAddByRSSFeeds` for both tiers.
  `tierLimitPlaceholders` needs no edit.
- `ProductMembershipsPageClient.tsx`: in `FIELD_ORDER`, replace `'trialMaxAddByRSSFeeds'` and
  `'premiumMaxAddByRSSFeeds'` with one `'maxAddByRSSFeeds'` in the position of the Trial entry
  (after `premiumMembershipCostAnnually`). In the save branch, the integer-field condition lists
  `editingField === 'maxAddByRSSFeeds'` once in place of the two, and the two
  `updateProductMembershipSettings({ trialMaxAddByRSSFeeds: parsed })` /
  `({ premiumMaxAddByRSSFeeds: parsed })` arms become one
  `if (editingField === 'maxAddByRSSFeeds') { response = await updateProductMembershipSettings({ maxAddByRSSFeeds: parsed }); }`,
  keeping the two refresh arms.
- `NewUserPageClient.tsx` (`#max-add-by-rss-feeds`) and `EditUserPageClient.tsx`
  (`#edit-user-rss-limit`): the `info` prop calls
  `t('advancedOverrides.addByRssFeedLimitHelp', { defaultLimit: trialEnt.maxAddByRSSFeeds, selectedDefault: selectedEnt.maxAddByRSSFeeds })`.
  Drop the `trialDefault` and `premiumDefault` arguments. If `premiumEnt` is then unused in a
  file, remove it there; keep it when the refresh-limit field still reads it.

## 4. Management catalog

In `packages/i18n-catalog/management/originals/*.json`, `productMemberships.fieldLabels`:
remove `trialMaxAddByRSSFeeds` and `premiumMaxAddByRSSFeeds` and add `maxAddByRSSFeeds` in the
position of the Trial key:

- en-US: `Max Add by RSS Feeds`
- es: `Máx. feeds de Añadir por RSS`
- fr: `Max. flux Ajouter par RSS`
- el-GR: `Μέγ. ροές προσθήκης μέσω RSS`

`advancedOverrides.addByRssFeedLimitHelp` (same key, new placeholders):

- en-US: `Maximum Add by RSS feeds for this account. Trial and Premium default: {defaultLimit}. Selected tier default for overrides: {selectedDefault}.`
- es: `Máximo de fuentes añadir por RSS para esta cuenta. Valor por defecto de prueba y Premium: {defaultLimit}. Valor por defecto del nivel seleccionado para anulaciones: {selectedDefault}.`
- fr: `Nombre maximal de flux ajouter par RSS pour ce compte. Défaut essai et Premium : {defaultLimit}. Défaut du niveau sélectionné pour les dérogations : {selectedDefault}.`
- el-GR: `Μέγιστος αριθμός ροών προσθήκη μέσω RSS για αυτόν τον λογαριασμό. Προεπιλογή δοκιμής και Premium: {defaultLimit}. Προεπιλογή επιλεγμένου επιπέδου για παρακάμψεις: {selectedDefault}.`

Do not edit `overrides/` by hand. Run `npm run i18n:compile` once after the originals change so
the override files drop the two removed `fieldLabels` keys and gain `maxAddByRSSFeeds` as
generated structure. Leave whatever it writes.

## Tests

- The two management API integration files as in § 1.
- `apps/management-web/e2e/products-hub.spec.ts`: the route mock keeps one variable
  `maxAddByRSSFeeds` (start 2) in place of `trialMaxAddByRSSFeeds`, reads
  `postData.maxAddByRSSFeeds`, and both response bodies return `maxAddByRSSFeeds` in place of the
  two fields. The edit step clicks `Edit Max Add by RSS Feeds` and fills the dialog field labeled
  `Max Add by RSS Feeds` with `9`. The rest of the step stays.
- `users-new-create-username-only.spec.ts`, `users-edit-advanced-overrides.spec.ts`, and
  `users-detail-force-logout.spec.ts`: each resolved-membership mock carries
  `maxAddByRSSFeeds` set to the Trial value it had (7, 6, and 6) in place of the two fields. The
  placeholder assertions (`Default: 7`, `Default: 6`) stay as written; the selected tier in those
  specs is Trial, and the shared value equals the old Trial value in the mock.

## Release scratchpad

```markdown
## Management shows one Add by RSS limit for Trial and Premium

- Surfaces: management-api, management-web
- Change: Products → Memberships has one "Max Add by RSS Feeds" row in place of the separate Trial and Premium rows. `PATCH /products/membership` takes `maxAddByRSSFeeds` in place of `trialMaxAddByRSSFeeds` and `premiumMaxAddByRSSFeeds`, and the response returns the one field. The user create and edit forms describe the one default next to the per-account override.
- Who notices: management users editing membership settings or account overrides; scripts that call the management PATCH with the old fields
- Operator steps: none
```
