**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Remove public membership GET

`GET /config` is the public catalog. `GET /product/membership` is removed. Pricing, comparison, and the management editor stay. Plan 104 records the env keys and the fallback comments.

## Rows

R38

## Runs after

100, 101, 102

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## Decisions

- The old path is removed. It does not redirect and it does not keep a second copy of the membership object. The app has not been deployed to the public, and plans 101 and 102 have already moved the callers.
- Client env for the seven settings stays. Plan 104 comments those keys. This plan does not edit env files.

## Route

In `apps/api/src/routes/product/membership.ts`, delete the `GET /` registration. Leave `GET /pricing` and `GET /comparison`.

Delete `MembershipController.getResolvedProductMembership`. Keep `buildPublicMembershipCatalog()`. `PublicClientConfigController` still calls it.

Delete `reqProductMembershipGet` and the `ProductMembershipCatalog` type from `packages/helpers-requests`, including the class method in `packages/helpers-requests/src/api/_request.ts`. Search the repo for `reqProductMembershipGet` and `/product/membership` outside `/pricing` and `/comparison`. The only remaining product callers should be pricing, comparison, and the management API (`packages/management-api-requests`, `getResolvedProductMembership` on the management client). Do not retarget the management editor.

`apps/api/openapi.yml` is large. Search `/product/membership:` and remove that path. Do not page the file. Leave `/product/membership/pricing` and `/product/membership/comparison`. Remove `ProductMembershipResponse` when nothing else refs it. `GET /config` from plan 100 stays.

`apps/api/src/test/external-services-and-meta.test.ts`: the Product membership defaults test `GET`s the old path. Change it to expect 404. Do not delete the pricing or comparison tests in that file. `apps/api/src/test/public-client-config.integration.test.ts` compares `GET /config` membership to the old path. Delete that comparison. Keep the field assertions on `GET /config`.

`apps/mobile/src/components/membership/MembershipStoreCheckout.tsx` is already commented by plan 102. Search comments for the string `GET /product/membership`. A comment that means the public catalog becomes `GET /config`. Leave `/pricing` and `/comparison`.

## Do not

- Do not edit env files, `setup.sh`, `ENV.md`, `APPS-MOBILE.md`, `docs/features/ADD-BY-RSS.md`, or the GitOps checkout. Plan 104 owns those.
- Do not change `GET /product/membership/pricing`, `GET /product/membership/comparison`, or the management editor.

## Tests

Update the two API tests named above. No new Playwright spec and no Maestro flow. The route removal is the 404 assertion. Web and mobile overlays are already unit-tested in plans 101 and 102.

## Files

- `apps/api/src/routes/product/membership.ts`
- `apps/api/src/controllers/membership.ts`
- `apps/api/openapi.yml`
- `packages/helpers-requests/src/api/membership/membership.ts`
- `packages/helpers-requests/src/api/_request.ts`
- `apps/api/src/test/external-services-and-meta.test.ts`
- `apps/api/src/test/public-client-config.integration.test.ts`

## Release scratchpad

none

Plan 104 appends the one scratchpad entry for this replacement.
