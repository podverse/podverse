### Session 1 - 2026-05-03

#### Prompt (Developer)

do it

#### Key Decisions

- Add shared trust-foundation and gating guidance skills in Podverse and Metaboost.
- Add a schema-phase rule to prevent accidental runtime behavior changes during foundation-only work.

#### Files Modified

- .llm/history/active/trust-gating-alignment-skills/trust-gating-alignment-skills-part-01.md
- .cursor/skills/trust-foundation-schema-only/SKILL.md
- .cursor/skills/entitlement-gating-rollout/SKILL.md
- .cursor/skills/membership-expiry-ux-contract/SKILL.md
- .cursor/rules/no-runtime-change-schema-phase.mdc

### Session 2 - 2026-05-04

#### Prompt (Developer)

@podverse/apps/api/src/controllers/account/accountAddByRSSParse.ts:228 make the requireCapability key value in podverse and metaboost an importable constant

#### Key Decisions

- Added `ACCOUNT_ENTITLEMENT_CAPABILITY` in `packages/helpers/src/lib/accountTrust.ts` with `satisfies` over `AccountEntitlementCapability`; updated API `requiredCapability` call sites and `accountHasCapability` comparisons to use the object.

#### Files Modified

- `packages/helpers/src/lib/accountTrust.ts`
- `apps/api/src/lib/accountEntitlements.ts`
- `apps/api/src/controllers/account/accountAddByRSSParse.ts`, `accountNotificationChannel.ts`, `accountNotificationChannelType.ts`, `accountSettings/accountSettingsNotificationType.ts`
- `apps/api/src/controllers/mq/mq.ts`
- `apps/api/src/controllers/stats/statsTrackEventAccount.ts`, `statsTrackEventChannel.ts`, `statsTrackEventClip.ts`, `statsTrackEventItem.ts`, `statsTrackEventPlaylist.ts`
- `packages/helpers/dist/**` (via `tsc`)
